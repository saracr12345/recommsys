import { Router } from 'express';
import { prisma } from '../prisma.js';

const router = Router();

function jsonArrayToStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String) : [];
}

function clamp01(x: number) {
  return Math.max(0, Math.min(1, x));
}

router.post('/', async (req, res) => {
  try {
    const { task = '', privacy = 'Any', latency = 1200, context = 4000 } =
      req.body || {};

    const needSelfHost = String(privacy).toLowerCase().includes('self');
    const minCtx = Math.max(0, Number(context) || 0);
    const targetLatency = Math.max(1, Number(latency) || 1);
    const isFinance = /finance|market|stock|trading|risk/i.test(String(task));

    const models = await prisma.modelProfile.findMany();

    const results = models
      .map((m) => {
        // domainTags is Prisma Json -> normalize to string[]
        const tags = jsonArrayToStringArray(m.domainTags);

        const privacyMatch =
          privacy === 'Any'
            ? 1
            : needSelfHost
              ? m.apiType === 'self-hosted' || m.apiType === 'open-source'
                ? 1
                : 0
              : m.apiType === 'saas'
                ? 1
                : 0;

        const ctxScore = clamp01(
          ((m.contextWindow ?? 0) - minCtx) / (minCtx || 1),
        );

        const latScore = clamp01(
          1 -
            ((m.latencyMs ?? targetLatency * 2) - targetLatency) /
              targetLatency,
        );

        const costScore = 1 / ((m.costPer1kTokens ?? 0.5) + 0.01);

        const domainScore = isFinance && tags.includes('finance') ? 0.5 : 0;

        const score =
          2 * privacyMatch +
          2 * ctxScore +
          2 * latScore +
          costScore +
          domainScore;

        const factors = {
          privacyMatch,
          ctxScore,
          latencyScore: latScore,
          costScore,
          domainScore,
        };

        const why: string[] = [];
        if (privacyMatch) why.push('Matches privacy requirement');
        if (ctxScore > 0) why.push('Satisfies context window');
        if (latScore > 0) why.push('Meets latency target');
        if (domainScore > 0) why.push('Relevant to finance tasks');

        // Json fields -> normalize
        const pros = jsonArrayToStringArray(m.pros);
        const cons = jsonArrayToStringArray(m.cons);
        const ragTips = jsonArrayToStringArray(m.ragTips);

        return {
          model: {
            name: m.name,
            provider: m.provider ?? 'Unknown',
            context: m.contextWindow ?? 0,
            latencyMs: m.latencyMs ?? 0,
            costPer1kTokens: m.costPer1kTokens ?? 0,
            tags,
            pros,
            cons,
            ragTip: ragTips[0] ?? '',
            sources: m.url ? [m.url] : [],
          },
          score,
          factors,
          why,
          confidence: 0,
        };
      })
      .sort((a, b) => b.score - a.score);

    // ---- Add confidence to the top result ----
    if (results.length > 0) {
      const topResult = results[0];
      const secondResult = results[1];

      let confidence = 0.4; // base
      confidence += topResult.factors.privacyMatch ? 0.15 : 0;
      confidence += topResult.factors.ctxScore > 0 ? 0.15 : 0;
      confidence += topResult.factors.latencyScore > 0 ? 0.15 : 0;

      const margin = secondResult
        ? topResult.score - secondResult.score
        : topResult.score;

      if (margin > 1.0) confidence += 0.15;

      confidence = clamp01(confidence);

      results[0] = { ...topResult, confidence };
    }

    // ---- Log the recommendation event (top 5) ----
    const event = await prisma.recommendationEvent.create({
      data: {
        task: String(task),
        privacy: String(privacy),
        latency: Number(latency) || 0,
        context: Number(context) || 0,
        results: results.slice(0, 5) as any,
        userId: (req as any).userId ?? null,
      },
    });

    res.json({ ok: true, eventId: event.id, results });
  } catch (err) {
    console.error('/recommend error', err);
    res.status(500).json({ ok: false, error: 'Internal server error' });
  }
});

export default router;
