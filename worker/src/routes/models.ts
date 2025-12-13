// worker/src/routes/models.ts
import { Router } from "express";
import { getModels, saveModel } from "../services/models/store.js";
import type { LlmModelProfile } from "@recommsys/shared";

const router = Router();

// GET /models – list all models
router.get("/", async (_req, res) => {
  try {
    const models = await getModels();
    res.json({ ok: true, models });
  } catch (err) {
    console.error("GET /models error:", err);
    res.status(500).json({ ok: false, error: "Internal server error" });
  }
});

// POST /models – upsert a model
router.post("/", async (req, res) => {
  try {
    const body = req.body as Partial<LlmModelProfile>;
    if (!body?.id || !body?.name) {
      return res.status(400).json({ ok: false, error: "Missing id or name" });
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
    console.error("POST /models error:", err);
    res.status(500).json({ ok: false, error: "Internal server error" });
  }
});

export default router;   // 👈 critical
