import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
  console.log(" Seeding model profiles...")

  const models = [
    {
      id: "gpt-4o-mini",
      name: "GPT-4o Mini",
      provider: "OpenAI",
      family: "GPT-4o",
      modality: "text",
      domainTags: ["finance", "general", "analysis"],
      apiType: "saas",
      contextWindow: 128000,
      costPer1kTokens: 0.00015,
      latencyMs: 300,
      source: "openai",
      url: "https://platform.openai.com/docs/models",
      license: "proprietary",
    },
    {
      id: "mistral-large",
      name: "Mistral Large",
      provider: "Mistral",
      family: "Mistral",
      modality: "text",
      domainTags: ["general", "enterprise"],
      apiType: "saas",
      contextWindow: 32768,
      costPer1kTokens: 0.0008,
      latencyMs: 450,
      source: "mistral",
      url: "https://docs.mistral.ai",
      license: "proprietary",
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
      costPer1kTokens: 0.0,
      latencyMs: 900,
      source: "meta",
      url: "https://ai.meta.com/llama/",
      license: "open",
    },
  ]

  for (const model of models) {
    await prisma.modelProfile.upsert({
      where: { id: model.id },
      update: model,
      create: model,
    })
  }

  console.log("Model profiles seeded.")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
