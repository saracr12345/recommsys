//worker/scripts/listArenaModels.ts
import { fetchAllArenaRows } from '../src/services/benchmarks/sources/lmsysArena'

async function main() {
  const rows = await fetchAllArenaRows()

  const unique = Array.from(new Set(rows.map(r => r.model)))
  console.log('Arena models:\n')
  for (const m of unique) {
    console.log(m)
  }

  console.log(`\nTotal: ${unique.length}`)
}

main().catch(console.error)