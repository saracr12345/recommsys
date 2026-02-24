import { PrismaClient } from '@prisma/client'
import { ingestArenaElo } from './sources/lmsysArena'

export async function ingestBenchmarks() {
  const prisma = new PrismaClient()

  try {
    const arena = await prisma.benchmark.findUnique({ where: { key: 'arena_elo' } })
    if (!arena) throw new Error('Benchmark "arena_elo" not found. Did you run seedBenchmarksOnly?')

    const arenaRes = await ingestArenaElo(prisma, arena)

    return { ok: true, results: [arenaRes] }
  } finally {
    await prisma.$disconnect()
  }
}