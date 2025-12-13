export type Model = {
    id: string;
    name: string;
    provider: string;
    context: number;
    latencyMs: number;
    costPer1kTokens: number;
    selfHost: boolean;
    tags: string[];
  };
  
  export type RecommendResult = {
    model: Model;
    score: number;
    confidence?: number;
    factors?: Record<string, number>; // e.g. costScore, latencyScore, etc.
    why?: string[]; // bullet explanations
  };
  
  export type RecommendResponse = { ok: true; results: RecommendResult[] };
  