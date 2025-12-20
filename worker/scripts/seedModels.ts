import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding model profiles…");

  const models = [
    // 1) GPT-4o Mini – cheap, small
    {
      id: "gpt-4o-mini",
      name: "GPT-4o Mini",
      provider: "OpenAI",
      family: "GPT-4o",
      modality: "text",
      domainTags: ["finance", "general", "analysis"],
      apiType: "saas",
      contextWindow: 128000,
      // rough guess, not official
      costPer1kTokens: 0.00015,
      latencyMs: 300,
      source: "openai-docs",
      url: "https://platform.openai.com/docs/models",
      license: "proprietary",
    },

    // 2) GPT-4o – “Smartest non-reasoning model”
    {
      id: "gpt-4o",
      name: "GPT-4o",
      provider: "OpenAI",
      family: "GPT-4o",
      modality: "text+image",
      domainTags: ["general", "analysis"],
      apiType: "saas",
      contextWindow: 128000,
      // $5 / 1M input → 0.005 / 1k
      costPer1kTokens: 0.005,
      latencyMs: 600, // just an approximate latency
      source: "openai-docs",
      url: "https://platform.openai.com/docs/models",
      license: "proprietary",
    },

    // 3) GPT-4.1 – big context
    {
      id: "gpt-4.1",
      name: "GPT-4.1",
      provider: "OpenAI",
      family: "GPT-4.1",
      modality: "text+image",
      domainTags: ["general", "analysis"],
      apiType: "saas",
      contextWindow: 1_047_576, // from Compare Models
      // $2 / 1M input → 0.002 / 1k
      costPer1kTokens: 0.002,
      latencyMs: 700, // approx
      source: "openai-docs",
      url: "https://platform.openai.com/docs/models",
      license: "proprietary",
    },

    // 4) o4-mini – reasoning, cheap
    {
      id: "o4-mini",
      name: "o4-mini",
      provider: "OpenAI",
      family: "o4",
      modality: "text",
      domainTags: ["reasoning", "analysis"],
      apiType: "saas",
      contextWindow: 200_000,
      // $1.10 / 1M input → 0.0011 / 1k
      costPer1kTokens: 0.0011,
      latencyMs: 800, // approx
      source: "openai-docs",
      url: "https://platform.openai.com/docs/models",
      license: "proprietary",
    },

    // 5) LLaMA 3 70B – self-host / open source
    {
      id: "llama-3-70b",
      name: "LLaMA 3 70B",
      provider: "Meta",
      family: "LLaMA",
      modality: "text",
      domainTags: ["open-source", "research"],
      apiType: "self-hosted",
      contextWindow: 8192,
      costPer1kTokens: 0.0, // infra cost only, no per-token fee
      latencyMs: 900,
      source: "meta",
      url: "https://ai.meta.com/llama/",
      license: "open",
    },
  ];

  for (const model of models) {
    await prisma.modelProfile.upsert({
      where: { id: model.id },
      update: model,
      create: model,
    });
  }

  console.log("✅ Model profiles seeded.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
