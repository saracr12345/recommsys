//worker/scripts/mapArenaAliases.ts
/// <reference types="node" />

import { PrismaClient } from '@prisma/client'
import { fetchAllArenaRows } from '../src/services/benchmarks/sources/lmsysArena'

const prisma = new PrismaClient()

/**
 * Normalization goals:
 * - strip parentheses + date/version suffix noise
 * - unify separators (hyphens / em-dashes / dots)
 * - remove “preview/beta/experimental” style markers
 * - make a stable base string for matching
 */
function normBase(str: string) {
  return String(str || '')
    .toLowerCase()

    // remove parentheses content (common in Arena)
    .replace(/\(.*?\)/g, '')

    // remove bracket content too (sometimes shows up)
    .replace(/\[.*?\]/g, '')

    // normalize punctuation dashes
    .replace(/–|—/g, '-')

    // remove dots + quotes
    .replace(/\./g, '')
    .replace(/['"]/g, '')

    // remove ISO date suffixes like -2025-04-16
    .replace(/-\d{4}-\d{2}-\d{2}/g, '')

    // remove “preview-05-06” style suffix bits (common in Gemini)
    .replace(/-\d{2}-\d{2}/g, '')

    // remove compact dates anywhere: 20250514
    .replace(/\b\d{8}\b/g, '')

    // remove short date codes at end like -0709 or -0528
    .replace(/-\d{3,4}$/g, '')

    // remove version-like chunks like -001 -002 at end
    .replace(/-\d{3}$/g, '')

    // remove common release markers
    .replace(/\b(preview|beta|experimental|latest|stable|release|snapshot|rc)\b/g, '')

    // collapse repeated separators
    .replace(/-+/g, '-')

    // collapse spaces
    .replace(/\s+/g, ' ')
    .trim()
}

function normSlug(str: string) {
  return normBase(str)
    .replace(/[^a-z0-9]+/g, '-') // spaces + punctuation -> dash
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

/**
 * “Squash” keeps only alphanumerics so:
 *  "Claude Opus 4 (20250514)" -> "claudeopus4"
 *  "claude-opus-4-6"          -> "claudeopus46"
 */
function squash(str: string) {
  return normBase(str).replace(/[^a-z0-9]/g, '')
}

const STOPWORDS = new Set([
  'the',
  'and',
  'model',
  'preview',
  'beta',
  'experimental',
  'latest',
  'stable',
  'release',
  'snapshot',
  'chat',
  'thinking',
  'instruct',
  'instruction',
  'it',
  'llm',
])

function tokenize(str: string) {
  return normBase(str)
    .split(/[^a-z0-9]+/g)
    .filter(Boolean)
    .filter((t) => t.length > 1)
    .filter((t) => !STOPWORDS.has(t))
    .filter((t) => !/^\d+$/.test(t)) // drop pure numbers
}

function jaccard(a: string[], b: string[]) {
  const A = new Set(a)
  const B = new Set(b)
  const inter = new Set([...A].filter((x) => B.has(x)))
  const unionSize = A.size + B.size - inter.size
  return unionSize === 0 ? 0 : inter.size / unionSize
}

// Light provider inference from Arena string (optional boost)
function inferProvider(arenaName: string): string | null {
  const s = arenaName.toLowerCase()
  if (s.includes('claude')) return 'anthropic'
  if (s.includes('gemini')) return 'google'
  if (s.includes('gpt') || s.includes('openai') || s.includes('o1') || s.includes('o3')) return 'openai'
  if (s.includes('llama') || s.includes('lama')) return 'meta'
  if (s.includes('mistral')) return 'mistral'
  if (s.includes('command') || s.includes('cohere')) return 'cohere'
  if (s.includes('nova') || s.includes('amazon')) return 'amazon'
  if (s.includes('qwen')) return 'alibaba'
  if (s.includes('deepseek')) return 'deepseek'
  if (s.includes('grok') || s.includes('xai')) return 'xai'
  return null
}

type DbRow = {
  id: string
  name: string
  provider: string | null
}

type DbIndexRow = {
  id: string
  provider: string
  slugId: string
  slugName: string
  baseId: string
  baseName: string
  squashId: string
  squashName: string
  tokens: string[]
}

async function main() {
  const rows = await fetchAllArenaRows()
  const arenaNames = Array.from(new Set(rows.map((r) => r.model))).filter(Boolean)

  // Pull DB models with id + name + provider
  const dbModels: DbRow[] = await prisma.modelProfile.findMany({
    select: { id: true, name: true, provider: true },
  })

  // Build fast lookup maps
  const byIdSlug = new Map<string, string>() // slug(id) -> id
  const byNameSlug = new Map<string, string>() // slug(name) -> id
  const byIdExact = new Map<string, string>() // exact id -> id
  const byNameExact = new Map<string, string>() // exact name -> id

  // Pre-index richer rows for contains + fuzzy
  const dbIndex: DbIndexRow[] = dbModels.map((m) => {
    const slugId = normSlug(m.id)
    const slugName = normSlug(m.name)
    const baseId = normBase(m.id)
    const baseName = normBase(m.name)
    const squashId = squash(m.id)
    const squashName = squash(m.name)
    const tokens = tokenize(m.name).concat(tokenize(m.id))
    const provider = (m.provider || '').toLowerCase()

    byIdExact.set(m.id, m.id)
    byNameExact.set(m.name, m.id)
    byIdSlug.set(slugId, m.id)
    byNameSlug.set(slugName, m.id)

    return {
      id: m.id,
      provider,
      slugId,
      slugName,
      baseId,
      baseName,
      squashId,
      squashName,
      tokens,
    }
  })

  // Optional: tiny manual overrides for truly weird cases (keep minimal)
  // Keys should be *Arena slug* (normSlug(arenaName)) to avoid punctuation issues.
  const MANUAL: Record<string, string> = {
    // Example patterns (only add if you see persistent misses):
    // 'amazon-nova-experimental-chat': 'amazon-nova-pro',
    // 'gemini-25-pro-preview': 'gemini-2.5-pro',
  }

  let matched = 0
  const unmatched: string[] = []

  const reasonCounts = new Map<string, number>()
  const bumpReason = (r: string) => reasonCounts.set(r, (reasonCounts.get(r) || 0) + 1)

  for (const arenaName of arenaNames) {
    const arenaSlug = normSlug(arenaName)
    const arenaBase = normBase(arenaName)
    const arenaSquash = squash(arenaName)
    const arenaTokens = tokenize(arenaName)
    const arenaProvider = inferProvider(arenaName)

    let matchId: string | null = null
    let matchReason = ''

    // 0) manual override
    if (!matchId && MANUAL[arenaSlug]) {
      matchId = MANUAL[arenaSlug]
      matchReason = 'manual'
    }

    // 1) exact id match
    if (!matchId && byIdExact.has(arenaName)) {
      matchId = byIdExact.get(arenaName)!
      matchReason = 'exact-id'
    }

    // 2) exact name match
    if (!matchId && byNameExact.has(arenaName)) {
      matchId = byNameExact.get(arenaName)!
      matchReason = 'exact-name'
    }

    // 3) slug match against id or name
    if (!matchId && byIdSlug.has(arenaSlug)) {
      matchId = byIdSlug.get(arenaSlug)!
      matchReason = 'slug-id'
    }
    if (!matchId && byNameSlug.has(arenaSlug)) {
      matchId = byNameSlug.get(arenaSlug)!
      matchReason = 'slug-name'
    }

    /**
     * 4) Canonicalized “contains” match (the missing piece)
     * We compare squashed/base strings so:
     * - arena: "Gemini-2.5-Pro-Preview-05-06" -> "gemini25pro"
     * - db id: "gemini-2.5-pro"              -> "gemini25pro"
     */
    if (!matchId) {
      let best: { id: string; score: number; why: string } | null = null

      // Guard against tiny strings matching everything
      const arenaLen = arenaSquash.length

      for (const cand of dbIndex) {
        const a = arenaSquash
        const b1 = cand.squashId
        const b2 = cand.squashName

        const minLen = Math.min(a.length, b1.length || 0, b2.length || 0)

        // If too short, skip (prevents silly matches like "gpt" -> everything)
        if (arenaLen < 6) continue
        if (minLen < 6) continue

        const hitId = b1 && (a.includes(b1) || b1.includes(a))
        const hitName = b2 && (a.includes(b2) || b2.includes(a))

        if (!hitId && !hitName) continue

        // Score = proportion of overlap by shorter/longer length
        // (simple but effective for variant suffix noise)
        const lenScoreId = b1 ? Math.min(a.length, b1.length) / Math.max(a.length, b1.length) : 0
        const lenScoreName = b2 ? Math.min(a.length, b2.length) / Math.max(a.length, b2.length) : 0
        let score = Math.max(lenScoreId, lenScoreName)

        // small bonus if provider aligns
        if (arenaProvider && cand.provider && cand.provider.includes(arenaProvider)) {
          score += 0.08
        }

        if (!best || score > best.score) {
          best = { id: cand.id, score, why: hitId ? 'contains-id' : 'contains-name' }
        }
      }

      // threshold — tune if needed (0.62 is a good starting point)
      if (best && best.score >= 0.62) {
        matchId = best.id
        matchReason = `${best.why}-${best.score.toFixed(2)}`
      }
    }

    // 5) fuzzy token match (Jaccard) with provider bonus
    if (!matchId) {
      let best: { id: string; score: number } | null = null

      for (const cand of dbIndex) {
        let score = jaccard(arenaTokens, cand.tokens)

        if (arenaProvider && cand.provider && cand.provider.includes(arenaProvider)) {
          score += 0.08
        }

        // tiny extra bonus if base strings are close-ish
        // (helps with “Claude Opus 4 (20250514)” etc)
        const a = arenaBase
        const b = cand.baseId
        if (a && b && (a.includes(b) || b.includes(a))) score += 0.05

        if (!best || score > best.score) best = { id: cand.id, score }
      }

      // threshold — tune this if needed
      if (best && best.score >= 0.50) {
        matchId = best.id
        matchReason = `fuzzy-${best.score.toFixed(2)}`
      }
    }

    if (!matchId) {
      unmatched.push(arenaName)
      continue
    }

    // Upsert alias
    await prisma.modelAlias.upsert({
      where: {
        source_alias: {
          source: 'lmsys-arena',
          alias: arenaName,
        },
      },
      update: { modelId: matchId },
      create: {
        source: 'lmsys-arena',
        alias: arenaName,
        modelId: matchId,
      },
    })

    matched++
    bumpReason(matchReason.split('-')[0] || matchReason)

    // Uncomment for debug:
    // console.log(`✓ ${arenaName} -> ${matchId} (${matchReason})`)
  }

  console.log(`Arena unique models: ${arenaNames.length}`)
  console.log(`Mapped aliases: ${matched}`)
  console.log(`Unmatched: ${unmatched.length}`)

  // quick breakdown of match reasons
  if (reasonCounts.size) {
    console.log('\nMatch reasons:')
    for (const [k, v] of Array.from(reasonCounts.entries()).sort((a, b) => b[1] - a[1])) {
      console.log(`- ${k}: ${v}`)
    }
  }

  // print first 50 unmatched so you can add manual overrides if needed
  if (unmatched.length) {
    console.log('\nFirst unmatched (50):')
    for (const n of unmatched.slice(0, 50)) console.log('-', n)
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())