// worker/src/services/recommend/pipeline.ts
import type { TaskProfile } from "./scoring.js";

type AdvisorModel = {
  id?: string;
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

export type PipelineStep = {
  role: "Retriever / Query Rewriter" | "Reasoner" | "Verifier";
  model: AdvisorModel; // can be blank-ish but always present
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
  const set = new Set((tags ?? []).map((t) => String(t).toLowerCase()));
  return wanted.some((w) => set.has(w.toLowerCase()));
}

function stableId(m: AdvisorModel) {
  return String(m.id ?? m.name ?? "");
}

/**
 * Deterministic chooseBest:
 * argmax(scoreFn), tie-break by id asc
 */
function chooseBest(
  candidates: AdvisorResult[],
  scoreFn: (r: AdvisorResult) => number,
  excludeModelId?: string
) {
  let best: AdvisorResult | null = null;
  let bestScore = -Infinity;
  let bestId = "";

  for (const r of candidates) {
    const id = stableId(r.model);
    if (excludeModelId && id === excludeModelId) continue;

    const s = scoreFn(r);
    if (s > bestScore || (s === bestScore && id.localeCompare(bestId) < 0)) {
      bestScore = s;
      best = r;
      bestId = id;
    }
  }
  return best;
}

function blankModel(): AdvisorModel {
  return {
    name: "",
    provider: "",
    apiType: null,
    context: 0,
    latencyMs: null,
    costPer1kTokens: null,
    tags: [],
  };
}

export function buildRecommendedPipeline(
  ranked: AdvisorResult[] | null | undefined,
  profile: TaskProfile
): RecommendedPipeline {
  const candidates = Array.isArray(ranked) ? ranked : [];

  // Always return something (UI-safe)
  if (candidates.length === 0) {
    const citationsRequired = profile.type === "qa_rag" || profile.highStakes || profile.finance;

    return {
      label: profile.finance ? "Finance-safe pipeline" : "Recommended pipeline",
      profile,
      steps: [
        {
          role: "Retriever / Query Rewriter",
          model: blankModel(),
          rationale: ["No eligible candidates."],
          suggestedConfig: { temperature: 0.1, maxOutputTokens: 350, structuredOutput: true, citationsRequired: false },
          promptHint: "Rewrite into JSON only: {query, entities, dateRange, constraints}.",
        },
        {
          role: "Reasoner",
          model: blankModel(),
          rationale: ["No eligible candidates."],
          suggestedConfig: { temperature: 0.2, maxOutputTokens: 900, structuredOutput: profile.type === "extraction", citationsRequired },
          promptHint: citationsRequired
            ? "Answer ONLY using retrieved snippets. Cite sources. If missing evidence, say so."
            : "Answer using provided context. Be explicit about assumptions and uncertainty.",
        },
        {
          role: "Verifier",
          model: blankModel(),
          rationale: ["No eligible candidates."],
          suggestedConfig: { temperature: 0.0, maxOutputTokens: 450, structuredOutput: true, citationsRequired },
          promptHint: "Verify against sources. Output JSON: {verdict, issues, corrected_answer?}. Fail if unsupported.",
        },
      ],
      notes: ["No models survived filtering. Showing placeholder 3-stage pipeline so UI always renders."],
    };
  }

  const top1 = candidates[0];

  // 1) Retriever: cheap + fast + “good enough”
  const retriever =
    chooseBest(
      candidates,
      (r) => 0.55 * r.factors.costScore + 0.35 * r.factors.latencyScore + 0.10 * r.factors.ctxScore
    ) ?? top1;

  const retrieverId = stableId(retriever.model);

  // 2) Reasoner: domain + context + low unknown penalty
  const reasoner =
    chooseBest(
      candidates,
      (r) =>
        0.45 * r.factors.domainScore +
        0.20 * r.factors.ctxScore +
        0.15 * r.factors.latencyScore +
        0.20 * (1 - r.factors.unknownPenalty),
      retrieverId // prefer different from retriever if possible
    ) ?? top1;

  const reasonerId = stableId(reasoner.model);

  // 3) Verifier: reasoning/analysis tags + low unknown penalty (prefer different from reasoner if possible)
  const verifier =
    chooseBest(
      candidates,
      (r) => {
        const tags = r.model.tags ?? [];
        const tagBoost = hasAnyTag(tags, ["reasoning", "analysis", "enterprise"]) ? 1 : 0;
        return 0.55 * tagBoost + 0.20 * r.factors.domainScore + 0.25 * (1 - r.factors.unknownPenalty);
      },
      reasonerId
    ) ?? reasoner;

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
        "Enforces 'unknown if not supported by evidence' for finance",
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

  const uniq = new Set([stableId(retriever.model), stableId(reasoner.model), stableId(verifier.model)]).size;

  const notes: string[] = [
    "Use the retriever step to reduce context bloat and make RAG more precise.",
    "In finance, always separate 'answer generation' from 'verification' for safety.",
    "If the verifier fails, re-run reasoning with stricter constraints or retrieve more evidence.",
    uniq >= 2
      ? "Stage diversity applied (retriever/reasoner/verifier prefer different models when possible)."
      : "Only one best candidate dominated the signals → stages reused the same model.",
  ];

  return {
    label: profile.finance ? "Finance-safe pipeline" : "Recommended pipeline",
    profile,
    steps,
    notes,
  };
}
