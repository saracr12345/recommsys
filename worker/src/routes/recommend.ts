// worker/src/routes/recommend.ts
import { Router } from "express";
import { prisma } from "../prisma.js";
import { buildRecommendedPipeline } from "../services/recommend/pipeline.js";
import {
  buildDomainText,
  clamp01,
  isUnknownNumber,
  jaccard,
  jsonArrayToStringArray,
  modalityAllows,
  privacyAllows,
  satBonus,
  taskProfile,
  tokenize,
} from "../services/recommend/scoring.js";

const router = Router();

type Weights = { ctx: number; lat: number; cost: number; domain: number };

function weightsFor(profile: ReturnType<typeof taskProfile>): Weights {
  // wwe can tune these later.
  if (profile.highStakes) return { ctx: 0.30, lat: 0.15, cost: 0.10, domain: 0.45 };
  if (profile.subtype === "trading") return { ctx: 0.15, lat: 0.40, cost: 0.15, domain: 0.30 };
  return { ctx: 0.25, lat: 0.25, cost: 0.20, domain: 0.30 };
}

function scoreToPercent(score01: number) {
  return Math.round(clamp01(score01) * 100);
}

router.post("/", async (req, res) => {
  try {
    const { task = "", privacy = "Any", latency = 1200, context = 4000 } = req.body || {};

    const minCtx = Math.max(0, Number(context) || 0);
    const targetLatency = Math.max(1, Number(latency) || 1);

    const profile = taskProfile(String(task));
    const w = weightsFor(profile);

    const models = await prisma.modelProfile.findMany();

    const qTokens = new Set(tokenize(String(task)));

    // Score each model, but APPLY HARD FILTERS FIRST.
    const scored = models
      .map((m) => {
        const tags = jsonArrayToStringArray(m.domainTags);
        const modality = String(m.modality ?? "");
        const apiType = String(m.apiType ?? "");

        // --- HARD FILTERS ---
        const hardFails: string[] = [];

        if (!privacyAllows(String(privacy), apiType)) {
          hardFails.push("Privacy requirement not satisfied");
        }

        if (!modalityAllows(profile.type, modality)) {
          hardFails.push("Modality not compatible with this task");
        }

        const ctx = Number(m.contextWindow ?? 0);
        const ctxUnknown = isUnknownNumber(m.contextWindow);

        // enforce minimum context (if user requests context)
        if (minCtx > 0) {
          if (ctxUnknown) hardFails.push("Context window unknown (cannot verify requirement)");
          else if (ctx < minCtx) hardFails.push("Context window below requirement");
        }

        const lat = Number(m.latencyMs ?? 0);
        const latUnknown = isUnknownNumber(m.latencyMs);

        // optional latency hard cutoff: > 5x target => exclude (keeps UI sane)
        if (!latUnknown && lat > targetLatency * 5) {
          hardFails.push("Latency far above target");
        }

        const cost = Number(m.costPer1kTokens ?? 0);
        const costUnknown = isUnknownNumber(m.costPer1kTokens);

        if (hardFails.length > 0) return null;

        // --- SOFT SCORING (0..1 utilities) ---

        // Context utility:
        // meeting requirement is "good" already; extra slack gives small bonus.
        const ctxSlack = Math.max(0, ctx - minCtx);
        const ctxScore = ctxUnknown
          ? 0.2
          : minCtx === 0
          ? 0.7 // no requirement provided; just give a baseline
          : 0.7 + 0.3 * satBonus(ctxSlack, Math.max(512, minCtx * 0.25));

        // Latency utility:
        // <= target => 1; above target decays smoothly; unknown penalized.
        let latencyScore = 0;
        if (latUnknown) latencyScore = 0.3;
        else if (lat <= targetLatency) latencyScore = 1;
        else latencyScore = Math.exp(-(lat - targetLatency) / targetLatency);

        // Cost utility:
        // cheaper => higher; unknown penalized.
        // The scale here (0.002) is a tunable “typical” reference point.
        let costScore = 0;
        if (costUnknown) costScore = 0.3;
        else costScore = 1 / (1 + cost / 0.002);

        // Domain/task fit:
        // Jaccard over tokens from task vs model metadata text (cheap baseline).
        const mTokens = new Set(tokenize(buildDomainText(m)));
        let domainScore = jaccard(qTokens, mTokens);

        // Finance boost (still not binary-only):
        if (profile.finance && tags.includes("finance")) {
          domainScore = Math.max(domainScore, 0.6);
        }

        // High-stakes preference: analysis/enterprise/reasoning tags
        if (
          profile.highStakes &&
          (tags.includes("analysis") || tags.includes("enterprise") || tags.includes("reasoning"))
        ) {
          domainScore = Math.max(domainScore, 0.7);
        }

        // Penalize unknown metadata (IMPORTANT)
        const unknownPenalty =
          (ctxUnknown ? 0.15 : 0) + (latUnknown ? 0.15 : 0) + (costUnknown ? 0.10 : 0);

        let score =
          w.ctx * ctxScore + w.lat * latencyScore + w.cost * costScore + w.domain * domainScore;

        score = clamp01(score - unknownPenalty);

        const warnings: string[] = [];
        if (ctxUnknown) warnings.push("Context window unknown/placeholder in catalog");
        if (latUnknown) warnings.push("Latency unknown/placeholder in catalog");
        if (costUnknown) warnings.push("Cost unknown/placeholder in catalog");

        const why: string[] = [
          `Context fit: ${scoreToPercent(ctxScore)}%`,
          `Latency fit: ${scoreToPercent(latencyScore)}%`,
          `Cost value: ${scoreToPercent(costScore)}%`,
        ];

        const pros = jsonArrayToStringArray(m.pros);
        const cons = jsonArrayToStringArray(m.cons);
        const ragTips = jsonArrayToStringArray(m.ragTips);

        return {
          model: {
            name: m.name,
            provider: m.provider ?? "Unknown",
            context: ctx,
            latencyMs: latUnknown ? null : lat,
            costPer1kTokens: costUnknown ? null : cost,
            tags,
            apiType: m.apiType ?? null,
            modality: m.modality ?? null,
            pros,
            cons,
            ragTip: ragTips[0] ?? "",
            sources: m.url ? [m.url] : [],
          },
          score, // 0..1
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
    //pipeline built 
    const pipeline = buildRecommendedPipeline(results as any, profile);

    // if nothing survives filters, return helpful message
    if (results.length === 0) {
      return res.json({
        ok: true,
        eventId: null,
        results: [],
        message:
          "No models satisfied the hard requirements. Try lowering context requirement, increasing latency target, or changing privacy.",
      });
    }

    // log event with results
    const payloadResults = {
      singleModels: results,
      recommendedPipeline: pipeline,
    };
    
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
