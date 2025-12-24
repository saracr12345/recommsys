// worker/src/services/recommend/pipeline.ts

type AdvisorModel = {
    name: string;
    provider: string;
    apiType: string | null;
    modality?: string | null;
    context: number;
    latencyMs: number | null;
    costPer1kTokens: number | null;
    tags: string[];
    ragTip?: string;
    sources?: string[];
  };
  
  type AdvisorResult = {
    model: AdvisorModel;
    score: number; // 0..1
    factors: {
      ctxScore: number;
      latencyScore: number;
      costScore: number;
      domainScore: number;
      unknownPenalty: number;
    };
    why: string[];
    warnings: string[];
    confidence: number;
  };
  
  type TaskProfile = {
    finance: boolean;
    type: string;
    highStakes: boolean;
    longDoc: boolean;
    subtype: string;
  };
  
  export type PipelineStep = {
    role: "Retriever / Query Rewriter" | "Reasoner" | "Verifier";
    model: AdvisorModel;
    rationale: string[];
    suggestedConfig: {
      temperature: number;
      maxOutputTokens: number;
      structuredOutput: boolean;
      citationsRequired: boolean;
    };
    promptHint: string;
  };
  
  export type RecommendedPipeline = {
    label: string;
    profile: TaskProfile;
    steps: PipelineStep[];
    notes: string[];
  };
  
  function hasAnyTag(tags: string[], wanted: string[]) {
    const set = new Set(tags.map((t) => String(t).toLowerCase()));
    return wanted.some((w) => set.has(w.toLowerCase()));
  }
  
  function chooseBest(
    candidates: AdvisorResult[],
    scoreFn: (r: AdvisorResult) => number,
    excludeName?: string
  ) {
    let best: AdvisorResult | null = null;
    let bestScore = -Infinity;
  
    for (const r of candidates) {
      if (excludeName && r.model.name === excludeName) continue;
      const s = scoreFn(r);
      if (s > bestScore) {
        bestScore = s;
        best = r;
      }
    }
    return best;
  }
  
  export function buildRecommendedPipeline(
    ranked: AdvisorResult[],
    profile: TaskProfile
  ): RecommendedPipeline | null {
    if (!ranked.length) return null;
  
    // We only build a pipeline for text tasks (your UI is text-only anyway).
    const candidates = ranked;
  
    // 1) Retriever / Query Rewriter: prioritize cheap + fast + “good enough”
    const retriever = chooseBest(
      candidates,
      (r) => 0.55 * r.factors.costScore + 0.35 * r.factors.latencyScore + 0.10 * r.factors.ctxScore
    );
  
    // 2) Reasoner: prioritize domain fit + context + overall quality (low unknown penalty)
    const reasoner = chooseBest(
      candidates,
      (r) =>
        0.45 * r.factors.domainScore +
        0.20 * r.factors.ctxScore +
        0.15 * r.factors.latencyScore +
        0.20 * (1 - r.factors.unknownPenalty)
    );
  
    // 3) Verifier: prioritize “reasoning/analysis” tags + low unknown penalty
    const verifier = chooseBest(
      candidates,
      (r) => {
        const tags = r.model.tags ?? [];
        const tagBoost = hasAnyTag(tags, ["reasoning", "analysis", "enterprise"]) ? 1 : 0;
        return 0.55 * tagBoost + 0.20 * r.factors.domainScore + 0.25 * (1 - r.factors.unknownPenalty);
      },
      reasoner?.model.name
    ) ?? reasoner;
  
    if (!retriever || !reasoner || !verifier) return null;
  
    const citationsRequired = profile.type === "qa_rag" || profile.highStakes || profile.finance;
  
    const steps: PipelineStep[] = [
      {
        role: "Retriever / Query Rewriter",
        model: retriever.model,
        rationale: [
          "Optimized for speed and cost",
          "Use it to rewrite the user query and generate structured retrieval filters",
        ],
        suggestedConfig: {
          temperature: 0.1,
          maxOutputTokens: 350,
          structuredOutput: true,
          citationsRequired: false,
        },
        promptHint:
          "Rewrite the query into 1) a clean search query, 2) required entities (tickers/ISIN/LEI), 3) date range, 4) must-have constraints. Output JSON only.",
      },
      {
        role: "Reasoner",
        model: reasoner.model,
        rationale: [
          "Best balance of task relevance and reliability for the request",
          citationsRequired ? "Must answer using retrieved sources only" : "Answer using provided context",
        ],
        suggestedConfig: {
          temperature: profile.highStakes ? 0.0 : 0.2,
          maxOutputTokens: 900,
          structuredOutput: profile.type === "extraction",
          citationsRequired,
        },
        promptHint:
          citationsRequired
            ? "Answer ONLY using the retrieved snippets. Cite sources inline. If the answer isn’t in the sources, say 'Not enough evidence.'"
            : "Answer using the provided context. Be explicit about assumptions and uncertainty.",
      },
      {
        role: "Verifier",
        model: verifier.model,
        rationale: [
          "Checks numeric consistency, contradictions, and hallucinations",
          "Enforces “unknown if not supported by evidence” for finance",
        ],
        suggestedConfig: {
          temperature: 0.0,
          maxOutputTokens: 450,
          structuredOutput: true,
          citationsRequired,
        },
        promptHint:
          "Verify the Reasoner output against the sources. Return JSON: {verdict: pass|fail, issues: [...], corrected_answer?: ...}. Fail if any claim lacks evidence.",
      },
    ];
  
    const notes: string[] = [
      "Use the retriever step to reduce context bloat and make RAG more precise.",
      "In finance, always separate 'answer generation' from 'verification' for safety.",
      "If the verifier fails, re-run reasoning with stricter constraints or retrieve more evidence.",
    ];
  
    return {
      label: profile.finance ? "Finance-safe pipeline" : "Recommended pipeline",
      profile,
      steps,
      notes,
    };
  }
  