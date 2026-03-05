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

type Weights = { ctx: number; lat: number; cost: number; domain: number; cap: number; bench: number };

function weightsFor(profile: TaskProfile): Weights {
  // bench is how much we trust benchmarks vs heuristics.
  if (profile.highStakes) return { ctx: 0.16, lat: 0.10, cost: 0.08, domain: 0.30, cap: 0.16, bench: 0.20 };
  if (profile.subtype === "trading") return { ctx: 0.10, lat: 0.34, cost: 0.12, domain: 0.20, cap: 0.10, bench: 0.14 };
  return { ctx: 0.20, lat: 0.20, cost: 0.16, domain: 0.24, cap: 0.10, bench: 0.10 };
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

/**
 * Convert any benchmark normalized score to 0..1
 * - If stored 0..100 => /100
 * - If stored 0..1 => use as-is
 */
function normBench01(x: number | null | undefined): number | null {
  if (x == null) return null;
  if (!Number.isFinite(x)) return null;
  if (x <= 1.001) return clamp01(x);
  return clamp01(x / 100);
}

/**
 * Aggregate multiple benchmarks into a single 0..1 score.
 * Only uses what exists; missing benchmarks don't kill the model.
 */
function aggregateBenchmarks01(args: {
  arena01: number | null;
  mmlu01: number | null;
  gsm8k01: number | null;
  humaneval01: number | null;
  hellaswag01: number | null;
  arc01: number | null;
  truthful01: number | null;
  profile: TaskProfile;
}): { bench01: number; detail: string[] } {
  const { profile } = args;

  // weights depend on task type
  const w = (() => {
    if (profile.type === "coding") return { humaneval: 0.50, arena: 0.20, mmlu: 0.15, gsm8k: 0.10, other: 0.05 };
    if (profile.type === "reasoning") return { mmlu: 0.35, gsm8k: 0.25, arc: 0.15, arena: 0.15, other: 0.10 };
    if (profile.type === "qa_rag") return { mmlu: 0.30, arena: 0.25, truthful: 0.20, hellaswag: 0.15, other: 0.10 };
    if (profile.highStakes) return { mmlu: 0.30, truthful: 0.25, arena: 0.20, gsm8k: 0.15, other: 0.10 };
    return { arena: 0.40, mmlu: 0.25, hellaswag: 0.20, other: 0.15 };
  })();

  const items: Array<{ key: string; v: number; w: number }> = [];

  const push = (key: string, v: number | null, weight: number) => {
    if (v == null) return;
    items.push({ key, v, w: weight });
  };

  push("arena", args.arena01, (w as any).arena ?? 0);
  push("mmlu", args.mmlu01, (w as any).mmlu ?? 0);
  push("gsm8k", args.gsm8k01, (w as any).gsm8k ?? 0);
  push("humaneval", args.humaneval01, (w as any).humaneval ?? 0);
  push("hellaswag", args.hellaswag01, (w as any).hellaswag ?? 0);
  push("arc", args.arc01, (w as any).arc ?? 0);
  push("truthfulqa", args.truthful01, (w as any).truthful ?? 0);

  if (items.length === 0) {
    return { bench01: 0.50, detail: ["Benchmarks: none available → neutral 0.50"] };
  }

  // normalize weights to sum=1 over available metrics
  const sumW = items.reduce((s, it) => s + it.w, 0) || 1;
  const bench01 = clamp01(items.reduce((s, it) => s + it.v * (it.w / sumW), 0));

  const detail = items.map((it) => `${it.key}: ${scoreToPercent(it.v)}% (w=${(it.w / sumW).toFixed(2)})`);
  return { bench01, detail };
}

router.post("/", async (req, res) => {
  try {
    // NOTE: your frontend is sending { task, constraints: {...} }
    // but your backend previously expected { task, privacy, latency, context }.
    // We'll accept both without breaking.
    const body = req.body || {};
    const task = String(body.task ?? "");
    const privacy = String(body.privacy ?? body.constraints?.privacy ?? "Any");
    const latency = Number(body.latency ?? body.constraints?.maxLatencyMs ?? 1200);
    const context = Number(body.context ?? body.constraints?.minContextWindow ?? 4000);

    const minCtx = Math.max(0, Number(context) || 0);
    const targetLatency = Math.max(1, Number(latency) || 1);

    const profile = (await classifyTask(task)) as ClassifiedProfile;
    const scoringTaskText = profile._meta?.normalizedTask ?? task;

    const qTokens = new Set(tokenize(scoringTaskText));
    const derivedMinCtx = profile.longDoc
      ? Math.max(minCtx, 16000)
      : profile.type === "qa_rag"
        ? Math.max(minCtx, 8000)
        : minCtx;

    const w = weightsFor(profile);
    const intent = domainIntentTags(profile);

    const models = await prisma.modelProfile.findMany({
      include: {
        benchmarkResults: {
          where: {
            source: "lmsys-arena",
            runId: "latest",
            benchmark: { key: { in: ["arena_elo", "mmlu", "gsm8k", "humaneval", "hellaswag", "arc_challenge", "truthfulqa"] } },
          },
          orderBy: { recordedAt: "desc" },
        },
      },
    });

    const scored = models
      .map((m) => {
        const domainTags = jsonArrayToStringArray(m.domainTags).map((t) => String(t).toLowerCase());
        const modality = String(m.modality ?? "");
        const apiType = String(m.apiType ?? "");

        const hardFails: string[] = [];
        if (!privacyAllows(privacy, apiType)) hardFails.push("Privacy requirement not satisfied");
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
          domainTags,
        });

        if (profile.highStakes && capScore < 0.6) hardFails.push("Insufficient capability for high-stakes tasks");
        if (hardFails.length > 0) return null;

        // ----- base components -----
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
          profile.type === "qa_rag"
            ? 0.004
            : profile.type === "summarization"
              ? 0.003
              : profile.type === "extraction"
                ? 0.002
                : 0.002;

        let costScore = 0;
        if (costUnknown) costScore = 0.3;
        else costScore = 1 / (1 + cost / costRef);

        const mTokens = new Set(tokenize(buildDomainText(m)));
        const baseTextFit = overlapScore(qTokens, mTokens);

        let tagHits = 0;
        for (const it of intent) if (hasTag(domainTags, it)) tagHits++;
        const tagBoost = intent.length === 0 ? 0 : Math.min(1, tagHits / Math.max(2, Math.ceil(intent.length * 0.5)));
        let domainScore = Math.max(baseTextFit, 0.55 * tagBoost + 0.45 * baseTextFit);

        if (profile.finance) {
          if (domainTags.includes("finance")) domainScore = Math.max(domainScore, 0.65);
          else domainScore = Math.min(domainScore, 0.5);
        }

        const unknownPenalty = (ctxUnknown ? 0.15 : 0) + (latUnknown ? 0.15 : 0) + (costUnknown ? 0.1 : 0);
        const clsConf = profile._meta?.confidence ?? 1;
        const confPenalty = clsConf < 0.4 ? 0.08 : clsConf < 0.6 ? 0.04 : 0;

        let stabilityPenalty = 0;
        if (domainTags.includes("preview")) stabilityPenalty += 0.05;
        if (domainTags.includes("legacy")) stabilityPenalty += 0.1;
        if (domainTags.includes("deprecated")) stabilityPenalty += 0.18;

        // ----- benchmarks (pick latest per key) -----
        const byKey = new Map<string, { raw: number; norm: number }>();
        for (const br of m.benchmarkResults ?? []) {
          const key = (br as any)?.benchmark?.key;
          if (!key) continue;
          if (!byKey.has(key)) byKey.set(key, { raw: br.scoreRaw, norm: br.scoreNormalized });
        }

        const arenaRaw = byKey.get("arena_elo")?.raw ?? null;
        const arena01 = normBench01(byKey.get("arena_elo")?.norm ?? null);

        const agg = aggregateBenchmarks01({
          profile,
          arena01,
          mmlu01: normBench01(byKey.get("mmlu")?.norm ?? null),
          gsm8k01: normBench01(byKey.get("gsm8k")?.norm ?? null),
          humaneval01: normBench01(byKey.get("humaneval")?.norm ?? null),
          hellaswag01: normBench01(byKey.get("hellaswag")?.norm ?? null),
          arc01: normBench01(byKey.get("arc_challenge")?.norm ?? null),
          truthful01: normBench01(byKey.get("truthfulqa")?.norm ?? null),
        });

        const baseWeightScale = 1 - w.bench;

        let score =
          baseWeightScale *
            (w.ctx * ctxScore + w.lat * latencyScore + w.cost * costScore + w.domain * domainScore + w.cap * capScore) +
          w.bench * agg.bench01;

        score = clamp01(score - unknownPenalty - confPenalty - stabilityPenalty);

        const warnings: string[] = [];
        if (ctxUnknown) warnings.push("Context window unknown/placeholder in catalog");
        if (latUnknown) warnings.push("Latency unknown/placeholder in catalog");
        if (costUnknown) warnings.push("Cost unknown/placeholder in catalog");
        if (confPenalty > 0) warnings.push("Task classification confidence low; ranking may be less precise");
        if (stabilityPenalty > 0) warnings.push("Model stability is lower (preview/legacy/deprecated)");

        const why: string[] = [
          `Benchmarks aggregate: ${scoreToPercent(agg.bench01)}%`,
          ...agg.detail,
          `Context fit: ${scoreToPercent(ctxScore)}%`,
          `Latency fit: ${scoreToPercent(latencyScore)}%`,
          `Cost value: ${scoreToPercent(costScore)}%`,
          `Domain fit: ${scoreToPercent(domainScore)}%`,
          `Capability: ${scoreToPercent(capScore)}%`,
        ];

        why.unshift(
          `Task normalized: ${profile._meta?.normalizedTask ?? task}`,
          ...(profile._meta?.detectedTypos?.length ? [`Typos fixed: ${profile._meta.detectedTypos.join(", ")}`] : [])
        );

        if (intent.length > 0) why.push(`Intent tags matched: ${tagHits}/${intent.length}`);

        return {
          model: {
            id: m.id,
            name: m.name,
            provider: m.provider ?? null,
            family: m.family ?? null,
            arenaElo: arenaRaw,
            apiType: m.apiType ?? null,
            modality: m.modality ?? null,
            license: m.license ?? null,
            contextWindow: ctxUnknown ? null : ctx,
            latencyMs: latUnknown ? null : lat,
            costPer1kTokens: costUnknown ? null : cost,
            domainTags,
            pros: jsonArrayToStringArray(m.pros),
            cons: jsonArrayToStringArray(m.cons),
            ragTips: jsonArrayToStringArray(m.ragTips),
            typicalUseCases: jsonArrayToStringArray(m.typicalUseCases),
            strengths: jsonArrayToStringArray(m.strengths),
            limitations: jsonArrayToStringArray(m.limitations),
            source: m.source ?? null,
            url: m.url ?? null,
          },
          score,
          factors: { ctxScore, latencyScore, costScore, domainScore, unknownPenalty },
          why,
          warnings,
          confidence: clamp01(score * (1 - unknownPenalty)),
        };
      })
      .filter(Boolean)
      .sort((a: any, b: any) => b.score - a.score);

    const results = scored.slice(0, 10);

    const pipelineCandidates = results.map((r: any) => ({
      model: r.model,
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
        message: "No models satisfied hard requirements. Lower context, increase latency target, or change privacy.",
      });
    }

    const event = await prisma.recommendationEvent.create({
      data: {
        task,
        privacy,
        latency: Number(latency) || 0,
        context: Number(context) || 0,
        results: payloadResults as any,
        userId: (req as any).userId ?? null,
      },
    });

    res.json({ ok: true, eventId: event.id, results: payloadResults, models: results.map((r: any) => r.model) });
  } catch (err) {
    console.error("/recommend error", err);
    res.status(500).json({ ok: false, error: "Internal server error" });
  }
});

export default router;