//worker/scripts/seedBechmarks.ts
/// <reference types="node" />

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

type BenchSeed = {
  key: string
  name: string
  category: string
  unit: 'percent' | 'elo' | 'score'
  description?: string
}

const BENCHMARKS: BenchSeed[] = [
  { key: 'mmlu', name: 'MMLU', category: 'reasoning', unit: 'percent', description: 'Massive Multitask Language Understanding' },
  { key: 'gsm8k', name: 'GSM8K', category: 'reasoning', unit: 'percent', description: 'Grade School Math 8K' },
  { key: 'humaneval', name: 'HumanEval', category: 'coding', unit: 'percent', description: 'Code generation pass@1' },
  { key: 'hellaswag', name: 'HellaSwag', category: 'general', unit: 'percent' },
  { key: 'arc_challenge', name: 'ARC-Challenge', category: 'reasoning', unit: 'percent' },
  { key: 'truthfulqa', name: 'TruthfulQA', category: 'safety', unit: 'percent' },
  { key: 'arena_elo', name: 'Chatbot Arena Elo', category: 'chat', unit: 'elo', description: 'LMSYS Arena Elo rating' },
]

async function seedBenchmarksOnly() {
  for (const b of BENCHMARKS) {
    await prisma.benchmark.upsert({
      where: { key: b.key },
      update: {
        name: b.name,
        category: b.category,
        unit: b.unit,
        description: b.description ?? null,
      },
      create: {
        key: b.key,
        name: b.name,
        category: b.category,
        unit: b.unit,
        description: b.description ?? null,
      },
    })
  }
}

seedBenchmarksOnly()
  .then(async () => {
    const count = await prisma.benchmark.count()
    console.log(`Seed complete. Benchmark rows = ${count}`)
  })
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })