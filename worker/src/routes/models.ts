// worker/src/routes/models.ts
import type { Request, Response } from 'express';
import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

import { getModels, saveModel } from '../services/models/store.js';
import type { LlmModelProfile } from '@recommsys/shared';

const prisma = new PrismaClient();
const router = Router();

/**
 * Coerce param id to number if it's digits-only, otherwise keep string.
 * Works whether Prisma uses Int or String ids.
 */
function coerceId(raw: string): string | number {
  return /^\d+$/.test(raw) ? Number(raw) : raw;
}

// GET /models - list all models
router.get('/', async (_req, res) => {
  try {
    const models = await getModels();
    res.json({ ok: true, models });
  } catch (err) {
    console.error('GET /models error:', err);
    res.status(500).json({ ok: false, error: 'Internal server error' });
  }
});

// POST /models - upsert a model
router.post('/', async (req, res) => {
  try {
    const body = req.body as Partial<LlmModelProfile>;
    if (!body?.id || !body?.name) {
      return res.status(400).json({ ok: false, error: 'Missing id or name' });
    }

    const saved = await saveModel({
      id: body.id,
      name: body.name,
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
    });

    res.json({ ok: true, model: saved });
  } catch (err) {
    console.error('POST /models error:', err);
    res.status(500).json({ ok: false, error: 'Internal server error' });
  }
});

/**
 * GET /models/:id
 * - This is the same handler you can also mount at /api/models/:id from app.ts if you want.
 */
export async function getModelById(req: Request, res: Response) {
  try {
    const rawId = req.params.id;
    const id = coerceId(rawId);

    const model = await prisma.modelProfile.findUnique({
      where: { id: id as any },
    });

    if (!model) {
      return res.status(404).json({ ok: false, error: 'Model not found' });
    }

    const arena = await prisma.benchmark.findUnique({ where: { key: 'arena_elo' } });

    const arenaRes = arena
      ? await prisma.benchmarkResult.findFirst({
          where: {
            benchmarkId: arena.id,
            modelId: id as any,
            source: 'lmsys-arena',
            runId: 'latest',
          },
          orderBy: { recordedAt: 'desc' },
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
    console.error('GET /models/:id error:', e);
    return res.status(500).json({ ok: false, error: 'Failed to load model' });
  }
}

// Route it on the router too:
router.get('/:id', getModelById);

export default router;