export interface LlmModelProfile {
  id: string;
  name: string;

  provider?: string;
  family?: string;

  domainTags: string[];

  contextWindow?: number;
  latencyMs?: number;
  costPer1kTokens?: number;

  apiType?: "saas" | "self-hosted" | "open-source";

  modality?: string;
  license?: string;

  source?: string;
  url?: string;

  pros?: string[];
  cons?: string[];
  ragTips?: string[];
  typicalUseCases?: string[];
  strengths?: string[];
  limitations?: string[];
}