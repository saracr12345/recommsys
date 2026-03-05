// worker/src/routes/leaderboard.ts
import type { Request, Response } from "express";
import { prisma } from "../prisma.js";

export async function leaderboardArena(req: Request, res: Response) {
  const limit = Math.min(parseInt(String(req.query.limit ?? "100"), 10) || 100, 200);
  const runId = String(req.query.runId ?? "latest");
  const source = String(req.query.source ?? "lmsys-arena");

  const arena = await prisma.benchmark.findUnique({ where: { key: "arena_elo" } });
  if (!arena) return res.status(404).json({ ok: false, error: "arena_elo benchmark not found" });

  const results = await prisma.benchmarkResult.findMany({
    where: { benchmarkId: arena.id, runId, source },
    orderBy: { scoreRaw: "desc" },
    take: limit,
    include: {
      model: {
        select: {
          id: true,
          name: true,
          provider: true,
          family: true,
          modality: true,
          domainTags: true,
          contextWindow: true,
          costPer1kTokens: true,
          latencyMs: true,
          license: true,
          url: true,
        },
      },
    },
  });

  const rows = results.map((r, idx) => ({
    rank: idx + 1,
    modelId: r.modelId,
    name: r.model.name,
    provider: r.model.provider ?? null,
    arenaElo: r.scoreRaw,
    confidence: r.confidence,
    recordedAt: r.recordedAt,
    tags: (r.model.domainTags as any[]) ?? [],
    latencyMs: r.model.latencyMs ?? null,
    costPer1kTokens: r.model.costPer1kTokens ?? null,
    contextWindow: r.model.contextWindow ?? null,
    license: r.model.license ?? null,
    modality: r.model.modality ?? null,
    family: r.model.family ?? null,
    url: r.model.url ?? null,
  }));

  res.json({ ok: true, benchmarkKey: "arena_elo", runId, source, rowsFetched: rows.length, rows });
}