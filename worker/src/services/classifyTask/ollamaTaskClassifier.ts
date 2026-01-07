import type { TaskProfile } from "../recommend/scoring.js";

export type ClassifiedTask = TaskProfile & {
  normalizedTask: string;      // corrected + canonical
  isNonsense: boolean;         // "parrot", "banana" etc.
  confidence: number;          // 0..1
  rationale: string[];         // short bullets
  detectedTypos: string[];     // e.g. ["sentinent->sentiment"]
};

const TASK_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    normalizedTask: { type: "string" },
    detectedTypos: { type: "array", items: { type: "string" }, maxItems: 8 },

    finance: { type: "boolean" },
    type: {
      type: "string",
      enum: [
        "extraction",
        "sentiment",
        "classification",
        "summarization",
        "qa_rag",
        "coding",
        "reasoning",
      ],
    },
    highStakes: { type: "boolean" },
    longDoc: { type: "boolean" },
    subtype: {
      type: "string",
      enum: [
        "filings",
        "markets_news",
        "risk",
        "trading",
        "compliance",
        "general_finance",
        "none",
      ],
    },

    isNonsense: { type: "boolean" },
    confidence: { type: "number" },
    rationale: { type: "array", items: { type: "string" }, maxItems: 6 },
  },
  required: [
    "normalizedTask",
    "detectedTypos",
    "finance",
    "type",
    "highStakes",
    "longDoc",
    "subtype",
    "isNonsense",
    "confidence",
    "rationale",
  ],
};

function env(name: string, fallback?: string) {
  const v = process.env[name];
  return v == null || v === "" ? fallback : v;
}

// very light pre-normalization to help small Ollama models
function preNormalize(s: string) {
  return String(s ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[^\p{L}\p{N}\s\-\+\.]/gu, ""); // keep words/numbers + a few symbols
}

async function ollamaChatJson<T>(args: {
  model: string;
  messages: { role: "system" | "user"; content: string }[];
  timeoutMs?: number;
  schema?: any;
}): Promise<T> {
  const baseUrl = env("OLLAMA_URL", "http://localhost:11434")!;
  const url = `${baseUrl.replace(/\/$/, "")}/api/chat`;

  const controller = new AbortController();
  const timeoutMs = args.timeoutMs ?? 3000;
  const t = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        model: args.model,
        stream: false,
        // Ollama supports structured JSON output via format. :contentReference[oaicite:0]{index=0}
        format: args.schema ?? "json",
        options: { temperature: 0.0 },
        messages: args.messages,
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`ollama /api/chat failed: ${res.status} ${text}`);
    }

    const data = (await res.json()) as any;
    const content = String(data?.message?.content ?? "").trim();
    if (!content) throw new Error("ollama returned empty content");
    return JSON.parse(content) as T;
  } finally {
    clearTimeout(t);
  }
}

export async function classifyTaskWithOllama(taskRaw: string): Promise<ClassifiedTask> {
  const model = env("OLLAMA_MODEL", "phi3:latest")!;
  const task = preNormalize(taskRaw);

  const system = [
    "You are a task classifier for an LLM recommender.",
    "You MUST output ONLY JSON matching the provided schema.",
    "",
    "Goals:",
    "1) Correct obvious spelling mistakes and output normalizedTask.",
    "2) Decide if the domain is finance. IMPORTANT: single keywords like 'earnings', 'revenue', 'guidance', 'ipo', '10-k', 'sec' are finance.",
    "3) Classify task type even with typos: 'sentinent' => 'sentiment'.",
    "4) If the input is a random animal/word with no task intent (e.g., 'parrot', 'banana'), set isNonsense=true, finance=false, subtype='none', type='reasoning'.",
    "",
    "Type definitions:",
    "- extraction: structured fields/JSON/entities/tables",
    "- sentiment: bullish/bearish/tone/polarity (even if misspelled)",
    "- classification: label into categories",
    "- summarization: TL;DR/brief/summarize",
    "- qa_rag: retrieval/citations/sources/grounding needed",
    "- coding: write/debug code",
    "- reasoning: general analysis/decision",
    "",
    "Finance subtypes:",
    "- filings: 10-K/10-Q/SEC/annual report/prospectus",
    "- markets_news: earnings/news/headlines/macro",
    "- trading: execution/orders/intraday/latency-sensitive",
    "- risk: VaR/stress/hedging/exposure",
    "- compliance: AML/KYC/sanctions/policy",
    "- general_finance: other finance",
    "",
    "High-stakes: finance + (risk/compliance/aml/kyc/advice/recommendation).",
    "LongDoc: filings/annual report/prospectus/pdf/statement/balance sheet.",
    "",
    "Confidence: 0..1. Be conservative if uncertain.",
  ].join("\n");

  const user = [
    `Raw input: "${taskRaw}"`,
    `Pre-normalized: "${task}"`,
    "",
    "Return JSON ONLY.",
  ].join("\n");

  const out = await ollamaChatJson<ClassifiedTask>({
    model,
    schema: TASK_SCHEMA,
    timeoutMs: 3500,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
  });

  // sanitize
  const confidence = Number.isFinite(out.confidence)
    ? Math.max(0, Math.min(1, out.confidence))
    : 0.5;

  return {
    ...out,
    normalizedTask: String(out.normalizedTask ?? task).trim() || task,
    confidence,
    rationale: Array.isArray(out.rationale) ? out.rationale.map(String).slice(0, 6) : [],
    detectedTypos: Array.isArray(out.detectedTypos) ? out.detectedTypos.map(String).slice(0, 8) : [],
    isNonsense: !!out.isNonsense,
    finance: !!out.finance,
    highStakes: !!out.highStakes,
    longDoc: !!out.longDoc,
  };
}
