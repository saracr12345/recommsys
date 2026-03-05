// worker/src/routes/models.ts
import type { Request, Response } from "express";
import { Router } from "express";
import { prisma } from "../prisma.js";

import { getModels, saveModel } from "../services/models/store.js";
import type { LlmModelProfile } from "@recommsys/shared";

const router = Router();

function coerceId(raw: string): string {
  return String(raw);
}

// GET /models - list all models (protected)
router.get("/", async (_req, res) => {
  try {
    const models = await getModels();
    res.json({ ok: true, models });
  } catch (err) {
    console.error("GET /models error:", err);
    res.status(500).json({ ok: false, error: "Internal server error" });
  }
});

// POST /models - upsert a model (protected)
router.post("/", async (req, res) => {
  try {
    const body = req.body as Partial<LlmModelProfile>;
    if (!body?.id || !body?.name) {
      return res.status(400).json({ ok: false, error: "Missing id or name" });
    }

    const saved = await saveModel({
      id: String(body.id),
      name: String(body.name),
      provider: body.provider,
      family: body.family,
      domainTags: body.domainTags ?? [],
      contextWindow: body.contextWindow,
      latencyMs: body.latencyMs,
      costPer1kTokens: body.costPer1kTokens,
      apiType: body.apiType,
      modality: body.modality,
      license: body.license,
      source: body.source,
      url: body.url,
      pros: body.pros ?? [],
      cons: body.cons ?? [],
      ragTips: body.ragTips ?? [],
      typicalUseCases: body.typicalUseCases ?? [],
      strengths: body.strengths ?? [],
      limitations: body.limitations ?? [],
    } as any);

    res.json({ ok: true, model: saved });
  } catch (err) {
    console.error("POST /models error:", err);
    res.status(500).json({ ok: false, error: "Internal server error" });
  }
});

/**
 * GET /models/:id (protected on router)
 * ALSO used by public /api/models/:id (mounted in app.ts)
 */
export async function getModelById(req: Request, res: Response) {
  try {
    const id = coerceId(req.params.id);

    const model = await prisma.modelProfile.findUnique({ where: { id } });
    if (!model) return res.status(404).json({ ok: false, error: "Model not found" });

    const arena = await prisma.benchmark.findUnique({ where: { key: "arena_elo" } });
    const arenaRes = arena
      ? await prisma.benchmarkResult.findFirst({
          where: { benchmarkId: arena.id, modelId: id, source: "lmsys-arena", runId: "latest" },
          orderBy: { recordedAt: "desc" },
        })
      : null;

    return res.json({
      ok: true,
      model: {
        ...model,
        domainTags: model.domainTags ?? [],
        pros: model.pros ?? [],
        cons: model.cons ?? [],
        ragTips: model.ragTips ?? [],
        typicalUseCases: model.typicalUseCases ?? [],
        strengths: model.strengths ?? [],
        limitations: model.limitations ?? [],
        arenaElo: arenaRes?.scoreRaw ?? null,
        arenaConfidence: arenaRes?.confidence ?? null,
        arenaRecordedAt: arenaRes?.recordedAt ?? null,
      },
    });
  } catch (e) {
    console.error("GET /models/:id error:", e);
    return res.status(500).json({ ok: false, error: "Failed to load model" });
  }
}

router.get("/:id", getModelById);

export default router;