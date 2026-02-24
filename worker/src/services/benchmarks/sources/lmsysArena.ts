import type { Benchmark, PrismaClient } from '@prisma/client'

type ArenaRow = {
  model: string
  elo: number
}

type HFRowResp = {
  rows: Array<{
    row: Record<string, unknown>
  }>
  num_rows_total?: number
}

type HFSplitsResp = {
  splits: Array<{
    config: string
    split: string
    dataset?: string
  }>
}

const DATASET = 'mathewhe/chatbot-arena-elo'

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n))
}

function toNumber(x: unknown): number | null {
  if (typeof x === 'number' && Number.isFinite(x)) return x
  if (typeof x === 'string') {
    const n = Number(x.replace(/,/g, '').trim())
    if (Number.isFinite(n)) return n
  }
  return null
}

// Simple Elo -> 0..100 mapping for UI bars (tune later)
export function normalizeArenaElo(rawElo: number): number {
  const MIN = 900
  const MAX = 1400
  const c = clamp(rawElo, MIN, MAX)
  return ((c - MIN) / (MAX - MIN)) * 100
}

async function fetchSplits(): Promise<Array<{ config: string; split: string }>> {
  const url = `https://datasets-server.huggingface.co/splits?dataset=${encodeURIComponent(DATASET)}`
  const res = await fetch(url)

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`HF /splits failed: ${res.status} ${res.statusText}\n${body}`)
  }

  const json = (await res.json()) as HFSplitsResp
  const splits = json.splits ?? []
  if (splits.length === 0) throw new Error(`No splits found for dataset ${DATASET}`)

  return splits.map((s) => ({ config: s.config, split: s.split }))
}

async function fetchRowsPage(args: {
  config: string
  split: string
  offset: number
  pageSize: number
}): Promise<HFRowResp> {
  const { config, split, offset, pageSize } = args

  const base =
    `https://datasets-server.huggingface.co/rows` +
    `?dataset=${encodeURIComponent(DATASET)}` +
    `&config=${encodeURIComponent(config)}` +
    `&split=${encodeURIComponent(split)}` +
    `&offset=${offset}`

  // Some HF deployments use limit, others use length. Try both.
  const urls = [`${base}&limit=${pageSize}`, `${base}&length=${pageSize}`]

  let lastOk: HFRowResp | null = null

  for (const url of urls) {
    const res = await fetch(url)
    if (!res.ok) continue

    const json = (await res.json()) as HFRowResp
    lastOk = json

    // Prefer the variant that actually returns rows
    if ((json.rows?.length ?? 0) > 0) return json
  }

  if (lastOk) return lastOk

  const debugRes = await fetch(urls[0])
  const body = await debugRes.text().catch(() => '')
  throw new Error(`HF /rows failed for config=${config} split=${split}\n${body}`)
}

/**
 * Fetch all rows from HF dataset-viewer /rows endpoint, paginated.
 */
export async function fetchAllArenaRows(): Promise<ArenaRow[]> {
  const splits = await fetchSplits()
  const pageSize = 200

  // Find a split/config that actually has rows
  let chosen: { config: string; split: string } | null = null
  for (const s of splits) {
    const first = await fetchRowsPage({ config: s.config, split: s.split, offset: 0, pageSize })
    const rows = first.rows ?? []
    if (rows.length > 0) {
      chosen = { config: s.config, split: s.split }
      break
    }
  }

  if (!chosen) return []

  const out: ArenaRow[] = []
  let offset = 0
  let loggedKeys = false

  while (true) {
    const page = await fetchRowsPage({
      config: chosen.config,
      split: chosen.split,
      offset,
      pageSize,
    })

    const rows = page.rows ?? []
    if (rows.length === 0) break

    if (!loggedKeys) {
      console.log('HF Arena first row keys:', Object.keys(rows[0]?.row ?? {}))
      loggedKeys = true
    }

    for (const r of rows) {
      const row = r.row ?? {}

      // Dataset uses these exact column names
      const modelRaw = row['Model']
      const eloRaw = row['Arena Score']

      if (typeof modelRaw !== 'string') continue
      const eloNum = toNumber(eloRaw)
      if (eloNum == null) continue

      out.push({ model: modelRaw, elo: eloNum })
    }

    if (rows.length < pageSize) break
    offset += pageSize
  }

  return out
}

/**
 * OPTIMIZED INGEST:
 * - Preload alias map once (no per-row ModelAlias query)
 * - Remove extra BenchmarkResult findUnique (upsert is enough)
 */
export async function ingestArenaElo(prisma: PrismaClient, arenaBenchmark: Benchmark) {
  const rows = await fetchAllArenaRows()
  const runId = 'latest'
  const source = 'lmsys-arena'

  // 1) preload aliases for this source
  const aliasRows = await prisma.modelAlias.findMany({
    where: { source },
    select: { alias: true, modelId: true },
  })

  const aliasMap = new Map<string, string>()
  for (const a of aliasRows) aliasMap.set(a.alias, a.modelId)

  let upserted = 0
  let skippedUnknownModel = 0

  for (const r of rows) {
    const modelId = aliasMap.get(r.model)
    if (!modelId) {
      skippedUnknownModel++
      continue
    }

    const scoreRaw = r.elo
    const scoreNormalized = normalizeArenaElo(scoreRaw)

    await prisma.benchmarkResult.upsert({
      where: {
        modelId_benchmarkId_source_runId: {
          modelId,
          benchmarkId: arenaBenchmark.id,
          source,
          runId,
        },
      },
      update: {
        scoreRaw,
        scoreNormalized,
        sourceUrl: 'https://huggingface.co/datasets/mathewhe/chatbot-arena-elo',
        confidence: 'medium',
        recordedAt: new Date(),
      },
      create: {
        modelId,
        benchmarkId: arenaBenchmark.id,
        source,
        runId,
        scoreRaw,
        scoreNormalized,
        sourceUrl: 'https://huggingface.co/datasets/mathewhe/chatbot-arena-elo',
        confidence: 'medium',
        // recordedAt default ok
      },
    })

    upserted++
  }

  return {
    source,
    runId,
    upserted,
    skippedUnknownModel,
    rowsFetched: rows.length,
    aliasesLoaded: aliasRows.length,
  }
}