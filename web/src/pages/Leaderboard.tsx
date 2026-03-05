// web/src/pages/Leaderboard.tsx
import { useEffect, useMemo, useState } from 'react'
import { Search, TrendingUp, Zap, DollarSign, Clock, Star, Filter, ArrowRight } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

import { api } from '@/lib/api'
import ModelDetail from '@/pages/ModelDetail'

type ApiModel = {
  id: string
  name: string
  provider: string | null
  family: string | null
  modality: string | null
  apiType: string | null
  license: string | null
  contextWindow: number | null
  latencyMs: number | null
  costPer1kTokens: number | null
  domainTags: any // backend returns JSON; usually array
  source: string | null
  url: string | null
  arenaElo: number | null
  arenaScore: number | null // 0..100
}

type ModelsResp = { ok: boolean; models: ApiModel[]; error?: string }

function toTags(x: any): string[] {
  if (Array.isArray(x)) return x.map((t) => String(t))
  return []
}

function deriveCategory(m: ApiModel): string {
  const tags = toTags(m.domainTags).map((t) => t.toLowerCase())
  const api = String(m.apiType || '').toLowerCase()

  if (api.includes('self')) return 'Self-hosted'
  if (api.includes('open')) return 'Open Source'
  if (tags.includes('vision') || String(m.modality || '').includes('image')) return 'Multimodal'
  if (tags.includes('coding')) return 'Coding'
  if (tags.includes('reasoning') || tags.includes('analysis')) return 'Reasoning'
  return 'General'
}

function confidenceLabel(m: ApiModel): 'High' | 'Medium' | 'Low' {
  // simple heuristic: if arenaScore present => medium/high; you can refine later with CI/votes
  if (m.arenaScore == null) return 'Low'
  if (m.arenaScore >= 75) return 'High'
  if (m.arenaScore >= 55) return 'Medium'
  return 'Low'
}

export default function Leaderboard() {
  const [loading, setLoading] = useState(true)
  const [models, setModels] = useState<ApiModel[]>([])

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [sortBy, setSortBy] = useState<'score' | 'latency' | 'cost'>('score')

  const [starredModels, setStarredModels] = useState<string[]>([])
  const [compareMode, setCompareMode] = useState(false)
  const [selectedForComparison, setSelectedForComparison] = useState<string[]>([])
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null)

  useEffect(() => {
    ;(async () => {
      try {
        setLoading(true)
        const data = await api<ModelsResp>('/api/models', { method: 'GET' })
        if (!data.ok) throw new Error(data.error || 'Failed to load models')
        setModels(data.models ?? [])
      } catch (e: any) {
        console.error(e)
        toast.error(e?.message || 'Failed to load models')
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const enriched = useMemo(() => {
    return models.map((m, idx) => {
      const category = deriveCategory(m)
      const tags = toTags(m.domainTags)
      const score = m.arenaScore ?? 0
      return {
        ...m,
        rank: idx + 1, // will re-rank after sort below
        category,
        tags,
        score,
        confidence: confidenceLabel(m),
      }
    })
  }, [models])

  const categories = useMemo(() => {
    const cats = Array.from(new Set(enriched.map((m) => m.category)))
    return ['all', ...cats]
  }, [enriched])

  const filteredModels = useMemo(() => {
    let filtered = enriched.filter((m) => {
      const name = (m.name || '').toLowerCase()
      const prov = (m.provider || '').toLowerCase()
      const q = searchQuery.toLowerCase()

      const matchesSearch = !q || name.includes(q) || prov.includes(q)
      const matchesCategory = selectedCategory === 'all' || m.category === selectedCategory
      return matchesSearch && matchesCategory
    })

    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'score':
          return (b.score ?? 0) - (a.score ?? 0)
        case 'latency':
          return (a.latencyMs ?? 999999) - (b.latencyMs ?? 999999)
        case 'cost':
          return (a.costPer1kTokens ?? 999999) - (b.costPer1kTokens ?? 999999)
        default:
          return 0
      }
    })

    // re-rank after sort
    return filtered.map((m, i) => ({ ...m, rank: i + 1 }))
  }, [enriched, searchQuery, selectedCategory, sortBy])

  const toggleStar = (id: string) => {
    setStarredModels((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  const toggleCompare = (id: string) => {
    setSelectedForComparison((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : prev.length < 3 ? [...prev, id] : prev,
    )
  }

  // Model detail view
  if (selectedModelId) {
    return <ModelDetail modelId={selectedModelId} onBack={() => setSelectedModelId(null)} />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Hero */}
      <div className="relative h-72 overflow-hidden bg-slate-900">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-700/60 via-slate-900/60 to-slate-900/80" />
        <div className="relative mx-auto flex h-full max-w-7xl flex-col items-center justify-center px-4 text-center">
          <h1 className="mb-3 text-5xl font-bold text-white">AI Model Leaderboard</h1>
          <p className="max-w-2xl text-lg text-white/90">
            Real benchmark data from your DB (Arena Elo ingested) — searchable, sortable, and clickable.
          </p>
        </div>
      </div>

      <div className="container mx-auto max-w-7xl px-4 py-12">
        {/* Search + Filters */}
        <div className="mb-8 space-y-6">
          <div className="relative">
            <Search className="absolute left-4 top-3.5 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Search by model name or provider..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-12 pl-12 text-base"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">Category</label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat === 'all' ? 'All Categories' : cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">Sort By</label>
              <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="score">Highest Arena Score</SelectItem>
                  <SelectItem value="latency">Fastest</SelectItem>
                  <SelectItem value="cost">Cheapest</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">Actions</label>
              <Button
                variant={compareMode ? 'default' : 'outline'}
                onClick={() => {
                  setCompareMode(!compareMode)
                  setSelectedForComparison([])
                }}
                className="w-full"
              >
                <Filter className="mr-2 h-4 w-4" />
                {compareMode ? 'Exit Compare' : 'Compare Models'}
              </Button>
            </div>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <Card className="p-10 text-center">
            <p className="text-muted-foreground">Loading models…</p>
          </Card>
        )}

        {/* Models Grid */}
        {!loading && (
          <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
            {filteredModels.map((m) => (
              <Card
                key={m.id}
                className="group cursor-pointer overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:shadow-xl"
              >
                <div className="p-6">
                  {/* Header */}
                  <div className="mb-4 flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-400 to-teal-600 text-lg font-bold text-white">
                        {m.rank}
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-foreground">{m.name}</h3>
                        <p className="text-sm text-muted-foreground">{m.provider ?? '—'}</p>
                      </div>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleStar(m.id)
                      }}
                      className="rounded-lg p-2 transition-colors hover:bg-secondary"
                    >
                      <Star
                        className={`h-5 w-5 ${
                          starredModels.includes(m.id) ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Score + Confidence */}
                  <div className="mb-6 flex items-center gap-4 border-b border-border pb-6">
                    <div className="flex-1">
                      <div className="flex items-baseline gap-2">
                        <span className="text-4xl font-bold text-primary">{Math.round(m.score ?? 0)}</span>
                        <span className="text-sm text-muted-foreground">/100</span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">Arena Score (normalized)</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Elo: {m.arenaElo == null ? '—' : Math.round(m.arenaElo)}
                      </p>
                    </div>

                    <div className="flex-1">
                      <Badge
                        variant={m.confidence === 'High' ? 'default' : m.confidence === 'Medium' ? 'secondary' : 'outline'}
                      >
                        {m.confidence} Confidence
                      </Badge>
                    </div>
                  </div>

                  {/* Metrics */}
                  <div className="mb-6 grid grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        <span className="text-xs font-medium">Latency</span>
                      </div>
                      <p className="text-sm font-semibold text-foreground">{m.latencyMs == null ? '—' : `${m.latencyMs}ms`}</p>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <DollarSign className="h-4 w-4" />
                        <span className="text-xs font-medium">Cost</span>
                      </div>
                      <p className="text-sm font-semibold text-foreground">
                        {m.costPer1kTokens == null ? '—' : `$${m.costPer1kTokens}/1K`}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Zap className="h-4 w-4" />
                        <span className="text-xs font-medium">Category</span>
                      </div>
                      <p className="text-sm font-semibold text-foreground">{m.category}</p>
                    </div>
                  </div>

                  {/* Tags */}
                  <div className="mb-6 flex flex-wrap gap-2">
                    {m.tags.slice(0, 8).map((tag: string) => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3">
                    {compareMode && (
                      <Button
                        variant={selectedForComparison.includes(m.id) ? 'default' : 'outline'}
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleCompare(m.id)
                        }}
                        disabled={!selectedForComparison.includes(m.id) && selectedForComparison.length >= 3}
                        className="flex-1"
                      >
                        {selectedForComparison.includes(m.id) ? 'Selected' : 'Select'}
                      </Button>
                    )}

                    <Button
                      variant="default"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedModelId(m.id)
                      }}
                      className="flex-1"
                    >
                      View Details
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Empty */}
        {!loading && filteredModels.length === 0 && (
          <Card className="p-12 text-center">
            <TrendingUp className="mx-auto mb-4 h-12 w-12 text-muted-foreground opacity-50" />
            <h3 className="mb-2 text-lg font-semibold text-foreground">No models found</h3>
            <p className="text-muted-foreground">Try adjusting filters or the search query.</p>
          </Card>
        )}
      </div>
    </div>
  )
}