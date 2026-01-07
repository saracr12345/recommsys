// worker/src/routes/recommend.ts
import { Router } from "express";
import { prisma } from "../prisma.js";
import { buildRecommendedPipeline } from "../services/recommend/pipeline.js";
import {
  buildDomainText,
  clamp01,
  isUnknownNumber,
  jsonArrayToStringArray,
  modalityAllows,
  privacyAllows,
  satBonus,
  tokenize,
  type TaskProfile,
} from "../services/recommend/scoring.js";
import { classifyTask } from "../services/classifyTask/index.js";
import { capabilityScore } from "../services/recommend/capability.js";

const router = Router();

type ClassifiedProfile = TaskProfile & {
  isNonsense?: boolean;
  _meta?: {
    normalizedTask?: string;
    confidence?: number; // 0..1
    detectedTypos?: string[];
    source?: string;
  };
};

type Weights = { ctx: number; lat: number; cost: number; domain: number; cap: number };

function weightsFor(profile: TaskProfile): Weights {
  if (profile.highStakes) return { ctx: 0.18, lat: 0.10, cost: 0.08, domain: 0.42, cap: 0.22 };
  if (profile.subtype === "trading") return { ctx: 0.12, lat: 0.38, cost: 0.12, domain: 0.28, cap: 0.10 };
  return { ctx: 0.22, lat: 0.22, cost: 0.18, domain: 0.28, cap: 0.10 };
}

function scoreToPercent(score01: number) {
  return Math.round(clamp01(score01) * 100);
}

function hasTag(tags: string[], t: string) {
  const s = new Set(tags.map((x) => String(x).toLowerCase()));
  return s.has(String(t).toLowerCase());
}

function domainIntentTags(profile: TaskProfile): string[] {
  const out: string[] = [];
  if (profile.finance) out.push("finance");
  if (profile.highStakes) out.push("enterprise", "analysis", "reasoning");

  if (profile.type === "sentiment") out.push("sentiment");
  if (profile.type === "qa_rag") out.push("rag", "retrieval", "search");
  if (profile.type === "extraction") out.push("extraction");
  if (profile.type === "coding") out.push("code", "coding", "programming");
  if (profile.type === "summarization") out.push("summarization", "summary");

  if (profile.subtype === "trading") out.push("trading", "low-latency", "fast");
  if (profile.subtype === "risk") out.push("risk");
  if (profile.subtype === "compliance") out.push("compliance");
  if (profile.subtype === "filings") out.push("filings");

  return out;
}

function overlapScore(q: Set<string>, m: Set<string>) {
  if (q.size === 0) return 0;
  let hit = 0;
  for (const tok of q) if (m.has(tok)) hit++;
  return hit / Math.max(3, Math.min(12, q.size));
}

router.post("/", async (req, res) => {
  try {
    const { task = "", privacy = "Any", latency = 1200, context = 4000 } = req.body || {};

    const minCtx = Math.max(0, Number(context) || 0);
    const targetLatency = Math.max(1, Number(latency) || 1);

    // AI classification (Ollama)
    const profile = (await classifyTask(String(task))) as ClassifiedProfile;

    const scoringTaskText = profile._meta?.normalizedTask ?? String(task);
    const qTokens = new Set(tokenize(scoringTaskText));

    const derivedMinCtx =
      profile.longDoc ? Math.max(minCtx, 16000) :
      profile.type === "qa_rag" ? Math.max(minCtx, 8000) :
      minCtx;

    const w = weightsFor(profile);
    const intent = domainIntentTags(profile);

    const models = await prisma.modelProfile.findMany();

    const scored = models
      .map((m) => {
        const tags = jsonArrayToStringArray(m.domainTags).map((t) => String(t).toLowerCase());
        const modality = String(m.modality ?? "");
        const apiType = String(m.apiType ?? "");

        const hardFails: string[] = [];

        if (!privacyAllows(String(privacy), apiType)) hardFails.push("Privacy requirement not satisfied");
        if (!modalityAllows(profile.type, modality)) hardFails.push("Modality not compatible with this task");

        const ctx = Number(m.contextWindow ?? 0);
        const ctxUnknown = isUnknownNumber(m.contextWindow);
        if (derivedMinCtx > 0) {
          if (ctxUnknown) hardFails.push("Context window unknown (cannot verify requirement)");
          else if (ctx < derivedMinCtx) hardFails.push("Context window below requirement");
        }

        const lat = Number(m.latencyMs ?? 0);
        const latUnknown = isUnknownNumber(m.latencyMs);
        if (!latUnknown && lat > targetLatency * 5) hardFails.push("Latency far above target");

        const cost = Number(m.costPer1kTokens ?? 0);
        const costUnknown = isUnknownNumber(m.costPer1kTokens);

        const capScore = capabilityScore({
          provider: m.provider,
          family: m.family,
          name: m.name,
          domainTags: tags,
        });

        if (profile.highStakes && capScore < 0.6) hardFails.push("Insufficient capability for high-stakes tasks");
        if (hardFails.length > 0) return null;

        // --- SOFT SCORING ---
        const ctxSlack = Math.max(0, ctx - derivedMinCtx);
        const ctxScore = ctxUnknown
          ? 0.2
          : derivedMinCtx === 0
            ? 0.7
            : 0.7 + 0.3 * satBonus(ctxSlack, Math.max(512, derivedMinCtx * 0.25));

        let latencyScore = 0;
        if (latUnknown) latencyScore = 0.3;
        else if (lat <= targetLatency) latencyScore = 1;
        else latencyScore = Math.exp(-(lat - targetLatency) / targetLatency);

        const costRef =
          profile.type === "qa_rag" ? 0.004 :
          profile.type === "summarization" ? 0.003 :
          profile.type === "extraction" ? 0.002 :
          0.002;

        let costScore = 0;
        if (costUnknown) costScore = 0.3;
        else costScore = 1 / (1 + cost / costRef);

        const mTokens = new Set(tokenize(buildDomainText(m)));
        const baseTextFit = overlapScore(qTokens, mTokens);

        let tagHits = 0;
        for (const it of intent) if (hasTag(tags, it)) tagHits++;

        const tagBoost =
          intent.length === 0
            ? 0
            : Math.min(1, tagHits / Math.max(2, Math.ceil(intent.length * 0.5)));

        let domainScore = Math.max(baseTextFit, 0.55 * tagBoost + 0.45 * baseTextFit);

        if (profile.finance) {
          if (tags.includes("finance")) domainScore = Math.max(domainScore, 0.65);
          else domainScore = Math.min(domainScore, 0.50);
        }

        const unknownPenalty =
          (ctxUnknown ? 0.15 : 0) + (latUnknown ? 0.15 : 0) + (costUnknown ? 0.10 : 0);

        const clsConf = profile._meta?.confidence ?? 1;
        const confPenalty = clsConf < 0.4 ? 0.08 : clsConf < 0.6 ? 0.04 : 0;

        let stabilityPenalty = 0;
        if (tags.includes("preview")) stabilityPenalty += 0.05;
        if (tags.includes("legacy")) stabilityPenalty += 0.10;
        if (tags.includes("deprecated")) stabilityPenalty += 0.18;

        let score =
          w.ctx * ctxScore +
          w.lat * latencyScore +
          w.cost * costScore +
          w.domain * domainScore +
          w.cap * capScore;

        score = clamp01(score - unknownPenalty - confPenalty - stabilityPenalty);

        const warnings: string[] = [];
        if (ctxUnknown) warnings.push("Context window unknown/placeholder in catalog");
        if (latUnknown) warnings.push("Latency unknown/placeholder in catalog");
        if (costUnknown) warnings.push("Cost unknown/placeholder in catalog");
        if (confPenalty > 0) warnings.push("Task classification confidence low; ranking may be less precise");
        if (stabilityPenalty > 0) warnings.push("Model stability is lower (preview/legacy/deprecated)");

        const why: string[] = [
          `Context fit: ${scoreToPercent(ctxScore)}%`,
          `Latency fit: ${scoreToPercent(latencyScore)}%`,
          `Cost value: ${scoreToPercent(costScore)}%`,
          `Domain fit: ${scoreToPercent(domainScore)}%`,
          `Capability: ${scoreToPercent(capScore)}%`,
        ];

        why.unshift(
          `Task normalized: ${profile._meta?.normalizedTask ?? String(task)}`,
          ...(profile._meta?.detectedTypos?.length
            ? [`Typos fixed: ${profile._meta.detectedTypos.join(", ")}`]
            : [])
        );
        if (intent.length > 0) why.push(`Intent tags matched: ${tagHits}/${intent.length}`);

        const pros = jsonArrayToStringArray(m.pros);
        const cons = jsonArrayToStringArray(m.cons);
        const ragTips = jsonArrayToStringArray(m.ragTips);

        return {
          model: {
            id: m.id,
            name: m.name,
            provider: m.provider ?? "Unknown",
            apiType: m.apiType ?? null,
            modality: m.modality ?? null,
            context: ctx,
            latencyMs: latUnknown ? null : lat,
            costPer1kTokens: costUnknown ? null : cost,
            tags,
            pros,
            cons,
            ragTip: ragTips[0] ?? "",
            sources: m.url ? [m.url] : [],
          },
          score,
          factors: {
            ctxScore,
            latencyScore,
            costScore,
            domainScore,
            unknownPenalty, 
          },
          why,
          warnings,
          confidence: clamp01(score * (1 - unknownPenalty)),
        };
      })
      .filter(Boolean)
      .sort((a: any, b: any) => b.score - a.score);

    const results = scored.slice(0, 10);

    const pipelineCandidates = results.map((r: any) => ({
      model: {
        id: r.model.id,
        name: r.model.name,
        provider: r.model.provider,
        apiType: r.model.apiType ?? null,
        modality: r.model.modality ?? null,
        context: r.model.context ?? 0,
        latencyMs: r.model.latencyMs ?? null,
        costPer1kTokens: r.model.costPer1kTokens ?? null,
        tags: r.model.tags ?? [],
        ragTip: r.model.ragTip ?? "",
        sources: r.model.sources ?? [],
      },
      score: r.score ?? 0,
      factors: {
        ctxScore: r.factors?.ctxScore ?? 0,
        latencyScore: r.factors?.latencyScore ?? 0,
        costScore: r.factors?.costScore ?? 0,
        domainScore: r.factors?.domainScore ?? 0,
        unknownPenalty: r.factors?.unknownPenalty ?? 0,
      },
      why: Array.isArray(r.why) ? r.why : [],
      warnings: Array.isArray(r.warnings) ? r.warnings : [],
      confidence: r.confidence ?? 0,
    }));

    const pipeline = buildRecommendedPipeline(pipelineCandidates as any, profile as any);

    const payloadResults = {
      singleModels: results,
      recommendedPipeline: pipeline,
      taskProfile: profile,
    };

    if (results.length === 0) {
      return res.json({
        ok: true,
        eventId: null,
        results: payloadResults,
        message:
          "No models satisfied the hard requirements. Try lowering context requirement, increasing latency target, or changing privacy.",
      });
    }

    const event = await prisma.recommendationEvent.create({
      data: {
        task: String(task),
        privacy: String(privacy),
        latency: Number(latency) || 0,
        context: Number(context) || 0,
        results: payloadResults as any,
        userId: (req as any).userId ?? null,
      },
    });

    res.json({ ok: true, eventId: event.id, results: payloadResults });
  } catch (err) {
    console.error("/recommend error", err);
    res.status(500).json({ ok: false, error: "Internal server error" });
  }
});

export default router;
