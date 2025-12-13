// shared/src/llm.ts

// Optional helper type for documentation / autocomplete.
// We still allow arbitrary strings in domainTags.
export type DomainTag =
  | "finance"
  | "legal"
  | "biomedical"
  | "general"
  | "open-source"
  | "analysis"
  | "enterprise";

export interface LlmModelProfile {
  id: string;
  name: string;

  provider?: string;
  family?: string;

  // IMPORTANT: allow general string tags so seed data like "analysis" works.
  domainTags: string[];

  contextWindow?: number;
  latencyMs?: number;
  costPer1kTokens?: number;

  apiType?: "saas" | "self-hosted" | "open-source";

  // NEW – match Prisma + seed + store.ts
  modality?: string;
  license?: string;

  source?: string;
  url?: string;
}
