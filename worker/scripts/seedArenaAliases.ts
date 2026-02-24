import { PrismaClient } from '@prisma/client'
import { fetchAllArenaRows } from '../src/services/benchmarks/sources/lmsysArena'

const prisma = new PrismaClient()

function normalize(str: string) {
  return str
    .toLowerCase()
    .replace(/\./g, '')
    .replace(/\s+/g, '-')
    .replace(/[^\w-]/g, '')
}

async function main() {
  const rows = await fetchAllArenaRows()
  const arenaNames = Array.from(new Set(rows.map(r => r.model)))

  const dbModels = await prisma.modelProfile.findMany({
    select: { id: true }
  })

  const dbMap = new Map<string, string>()
  for (const m of dbModels) {
    dbMap.set(normalize(m.id), m.id)
  }

  let created = 0

  for (const arenaName of arenaNames) {
    const norm = normalize(arenaName)

    const match = dbMap.get(norm)

    if (!match) continue

    await prisma.modelAlias.upsert({
      where: {
        source_alias: {
          source: 'lmsys-arena',
          alias: arenaName
        }
      },
      update: { modelId: match },
      create: {
        source: 'lmsys-arena',
        alias: arenaName,
        modelId: match
      }
    })

    created++
  }

  console.log(`Created/updated ${created} aliases`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())