import type { LlmModelProfile } from "@recommsys/shared";
import { prisma } from "../../prisma.js"
import type { ModelProfile } from "@prisma/client";
import type { JsonValue } from "@prisma/client/runtime/library";

/**
 * Helper to cast JSON → string[]
 */
function jsonToStringArray(val: JsonValue | null): string[] {
  if (!val) return [];
  if (Array.isArray(val)) {
    return val
      .filter((x): x is string => typeof x === "string")
      .map((s) => s);
  }
  return [];
}

/**
 * Prisma row → shared LlmModelProfile
 */
function fromDb(row: ModelProfile): LlmModelProfile {
  return {
    id: row.id,
    name: row.name,

    provider: row.provider ?? undefined,
    family: row.family ?? undefined,

    contextWindow: row.contextWindow ?? undefined,
    latencyMs: row.latencyMs ?? undefined,
    costPer1kTokens: row.costPer1kTokens ?? undefined,
    apiType: (row.apiType as any) ?? undefined,

    domainTags: jsonToStringArray(row.domainTags),

    modality: row.modality ?? undefined,
    license: row.license ?? undefined,

    source: row.source ?? undefined,
    url: row.url ?? undefined,
    pros: jsonToStringArray(row.pros),
    cons: jsonToStringArray(row.cons),
    ragTips: jsonToStringArray(row.ragTips),
    typicalUseCases: jsonToStringArray(row.typicalUseCases),
    strengths: jsonToStringArray(row.strengths),
    limitations: jsonToStringArray(row.limitations),
  };
}

/**
 * Save or update a model profile
 */
export async function saveModel(profile: LlmModelProfile): Promise<LlmModelProfile> {
  const saved = await prisma.modelProfile.upsert({
    where: { id: profile.id },
    create: {
      id: profile.id,
      name: profile.name,
      provider: profile.provider ?? null,
      family: profile.family ?? null,

      contextWindow: profile.contextWindow ?? null,
      latencyMs: profile.latencyMs ?? null,
      costPer1kTokens: profile.costPer1kTokens ?? null,
      apiType: profile.apiType ?? null,

      domainTags: profile.domainTags ?? [],

      modality: profile.modality ?? null,
      license: profile.license ?? null,

      source: profile.source ?? null,
      url: profile.url ?? null,
    },
    update: {
      name: profile.name,
      provider: profile.provider ?? null,
      family: profile.family ?? null,

      contextWindow: profile.contextWindow ?? null,
      latencyMs: profile.latencyMs ?? null,
      costPer1kTokens: profile.costPer1kTokens ?? null,
      apiType: profile.apiType ?? null,

      domainTags: profile.domainTags ?? [],

      modality: profile.modality ?? null,
      license: profile.license ?? null,

      source: profile.source ?? null,
      url: profile.url ?? null,
    },
  });

  return fromDb(saved);
}

/**
 * Get all models (for Advisor + /models endpoint)
 */
export async function getModels(): Promise<LlmModelProfile[]> {
  const rows = await prisma.modelProfile.findMany({
    orderBy: { createdAt: "asc" },
  });
  return rows.map(fromDb);
}

/**
 * Get one model by id (optional helper)
 */
export async function getModel(id: string): Promise<LlmModelProfile | null> {
  const row = await prisma.modelProfile.findUnique({ where: { id } });
  return row ? fromDb(row) : null;
}
