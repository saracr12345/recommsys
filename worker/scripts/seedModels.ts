// worker/scripts/seedModels.ts
import { PrismaClient, Prisma } from "@prisma/client";

console.log("🚀 seedModels.ts started");

const prisma = new PrismaClient();

/**
 * NOTE:
 * - Your schema shows Json fields (domainTags, pros, cons, ragTips, typicalUseCases, strengths, limitations)
 * - Prisma expects those as `Prisma.JsonArray`/`Prisma.InputJsonValue`
 * - The loop uses `for...of` so the script won't exit early.
 */

const models: Array<{
  id: string;
  name: string;
  provider: string;
  family: string;
  modality: string;
  domainTags: string[];
  apiType: string;
  contextWindow: number;
  costPer1kTokens: number;
  latencyMs: number;
  license: string;
  source: string;
  url: string;

  pros: string[];
  cons: string[];
  ragTips: string[];
  typicalUseCases: string[];
  strengths: string[];
  limitations: string[];
}> = [
  {
    id: "gpt-4o-mini",
    name: "GPT-4o Mini",
    provider: "OpenAI",
    family: "GPT-4o",
    modality: "text",
    domainTags: ["general", "analysis", "finance"],
    apiType: "saas",
    contextWindow: 128000,
    costPer1kTokens: 0.00015,
    latencyMs: 300,
    license: "proprietary",
    source: "openai-docs",
    url: "https://platform.openai.com/docs/models",

    pros: [
      "Extremely cost-efficient",
      "Fast response times",
      "Large context window for its size",
    ],
    cons: [
      "Weaker reasoning than larger GPT models",
      "Not ideal for complex multi-step logic",
    ],
    ragTips: [
      "Chunk documents aggressively to reduce noise",
      "Use reranking for finance-heavy corpora",
    ],
    typicalUseCases: ["Classification", "Summarisation", "Sentiment analysis"],
    strengths: ["Low latency", "High throughput"],
    limitations: ["Limited deep reasoning"],
  },

  {
    id: "gpt-4o",
    name: "GPT-4o",
    provider: "OpenAI",
    family: "GPT-4o",
    modality: "text+image",
    domainTags: ["general", "analysis"],
    apiType: "saas",
    contextWindow: 128000,
    costPer1kTokens: 0.005,
    latencyMs: 600,
    license: "proprietary",
    source: "openai-docs",
    url: "https://platform.openai.com/docs/models",

    pros: [
      "Strong reasoning and instruction-following",
      "Multimodal support",
      "Reliable across many tasks",
    ],
    cons: ["More expensive than mini variants", "Cloud-only deployment"],
    ragTips: ["Use hybrid search (BM25 + embeddings)", "Provide explicit system instructions"],
    typicalUseCases: ["RAG systems", "Decision support", "Data extraction"],
    strengths: ["Balanced intelligence", "Strong generalization"],
    limitations: ["Cost at scale"],
  },

  {
    id: "gpt-4.1",
    name: "GPT-4.1",
    provider: "OpenAI",
    family: "GPT-4.1",
    modality: "text+image",
    domainTags: ["analysis", "enterprise"],
    apiType: "saas",
    contextWindow: 1_047_576,
    costPer1kTokens: 0.002,
    latencyMs: 700,
    license: "proprietary",
    source: "openai-docs",
    url: "https://platform.openai.com/docs/models",

    pros: ["Massive context window", "Strong analytical reasoning"],
    cons: ["Higher latency", "Overkill for small tasks"],
    ragTips: ["Store entire documents without chunking", "Use metadata filters sparingly"],
    typicalUseCases: ["Long document analysis", "Legal or financial filings"],
    strengths: ["Long-context understanding"],
    limitations: ["Latency-sensitive workloads"],
  },

  {
    id: "o4-mini",
    name: "o4-mini",
    provider: "OpenAI",
    family: "o4",
    modality: "text",
    domainTags: ["analysis", "reasoning"],
    apiType: "saas",
    contextWindow: 200000,
    costPer1kTokens: 0.0011,
    latencyMs: 800,
    license: "proprietary",
    source: "openai-docs",
    url: "https://platform.openai.com/docs/models",

    pros: ["Optimized for structured reasoning", "Cost-efficient for reasoning tasks"],
    cons: ["Less fluent language generation"],
    ragTips: ["Use for reasoning after retrieval", "Pair with a generator model"],
    typicalUseCases: ["Chain-of-thought reasoning", "Verification"],
    strengths: ["Reasoning efficiency"],
    limitations: ["Natural language quality"],
  },

  {
    id: "llama-3-70b",
    name: "LLaMA 3 70B",
    provider: "Meta",
    family: "LLaMA",
    modality: "text",
    domainTags: ["open-source", "research"],
    apiType: "self-hosted",
    contextWindow: 8192,
    costPer1kTokens: 0,
    latencyMs: 900,
    license: "open",
    source: "meta",
    url: "https://ai.meta.com/llama/",

    pros: ["Fully self-hostable", "No per-token cost", "Strong open-source community"],
    cons: ["High infrastructure cost", "Requires tuning for best performance"],
    ragTips: ["Quantize for inference", "Use vector DB with aggressive filtering"],
    typicalUseCases: ["Private deployments", "Research"],
    strengths: ["Privacy", "Control"],
    limitations: ["Operational complexity"],
  },
];

function asJsonArray(arr: string[]): Prisma.InputJsonValue {
  // Prisma Json fields accept string[], but typing can be fussy depending on your client version.
  // This keeps TS happy.
  return arr as unknown as Prisma.InputJsonValue;
}

async function main() {
  for (const m of models) {
    await prisma.modelProfile.upsert({
      where: { id: m.id },
      update: {
        name: m.name,
        provider: m.provider,
        family: m.family,
        modality: m.modality,
        apiType: m.apiType,
        contextWindow: m.contextWindow,
        costPer1kTokens: m.costPer1kTokens,
        latencyMs: m.latencyMs,
        license: m.license,
        source: m.source,
        url: m.url,

        domainTags: asJsonArray(m.domainTags),
        pros: asJsonArray(m.pros),
        cons: asJsonArray(m.cons),
        ragTips: asJsonArray(m.ragTips),
        typicalUseCases: asJsonArray(m.typicalUseCases),
        strengths: asJsonArray(m.strengths),
        limitations: asJsonArray(m.limitations),
      },
      create: {
        id: m.id,
        name: m.name,
        provider: m.provider,
        family: m.family,
        modality: m.modality,
        apiType: m.apiType,
        contextWindow: m.contextWindow,
        costPer1kTokens: m.costPer1kTokens,
        latencyMs: m.latencyMs,
        license: m.license,
        source: m.source,
        url: m.url,

        domainTags: asJsonArray(m.domainTags),
        pros: asJsonArray(m.pros),
        cons: asJsonArray(m.cons),
        ragTips: asJsonArray(m.ragTips),
        typicalUseCases: asJsonArray(m.typicalUseCases),
        strengths: asJsonArray(m.strengths),
        limitations: asJsonArray(m.limitations),
      },
    });
  }

  const count = await prisma.modelProfile.count();
  console.log(`✅ Seed complete. ModelProfile rows = ${count}`);
}

main()
  .catch((e) => {
    console.error("❌ seedModels.ts failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
