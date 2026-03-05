// web/src/pages/AdvisorPage.tsx
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import {
  ArrowRight,
  Clock,
  DollarSign,
  Filter,
  Search,
  Star,
  TrendingUp,
  Zap,
} from 'lucide-react'

import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

import ModelDetail from '@/pages/ModelDetail'

const MAX_SCORE = 1 // backend score is 0..1

// --- BACKEND SHAPES (from worker/src/routes/recommend.ts) ---

type RecommendModelDTO = {
  id: string
  name: string
  provider?: string | null
  family?: string | null

  arenaElo?: number | null

  apiType?: string | null
  modality?: string | null
  license?: string | null

  contextWindow?: number | null
  latencyMs?: number | null
  costPer1kTokens?: number | null

  domainTags?: string[] // already normalized to string[] in backend
  pros?: string[]
  cons?: string[]
  ragTips?: string[]
  typicalUseCases?: string[]
  strengths?: string[]
  limitations?: string[]

  source?: string | null
  url?: string | null
}

type SingleModelResultDTO = {
  model: RecommendModelDTO
  score: number // 0..1
  confidence: number // 0..1
  why?: string[]
  warnings?: string[]
}

type RecommendResponseDTO = {
  ok: boolean
  eventId: string | number | null
  results: {
    singleModels: SingleModelResultDTO[]
    recommendedPipeline?: any
    taskProfile?: any
  }
  message?: string
}

// --- UI SHAPE ---

type RecommendedModel = {
  id: string
  name: string
  provider?: string | null
  family?: string | null

  score: number // 0..1
  confidence: number // 0..1

  contextWindow?: number | null
  latencyMs?: number | null
  costPer1kTokens?: number | null
  modality?: string | null
  license?: string | null
  domainTags?: string[]

  arenaElo?: number | null

  why?: string[]
  warnings?: string[]
}

function confidenceLabel01(c01?: number) {
  const v = typeof c01 === 'number' ? c01 : 0.5
  if (v >= 0.75) return 'High Confidence'
  if (v <= 0.45) return 'Low Confidence'
  return 'Medium Confidence'
}

function confidenceBadgeVariant01(c01?: number) {
  const v = typeof c01 === 'number' ? c01 : 0.5
  if (v >= 0.75) return 'default'
  if (v <= 0.45) return 'outline'
  return 'secondary'
}

export default function AdvisorPage() {
  // --- Task + constraints (mapped to backend inputs)
  const [task, setTask] = useState('')
  const [privacy, setPrivacy] = useState<'Any' | 'Private' | 'OnPrem'>('Any')

  // backend expects: latency (number), context (number)
  const [maxLatencyMs, setMaxLatencyMs] = useState<number | 'any'>('any')
  const [minContext, setMinContext] = useState<number | 'any'>('any')

  // UI-only filters (backend does not hard-filter on these right now, but we keep them for UX)
  const [maxCostPer1k, setMaxCostPer1k] = useState<number | 'any'>('any')
  const [modality, setModality] = useState<'any' | 'text' | 'text+image'>('any')

  // UI state
  const [loading, setLoading] = useState(false)
  const [models, setModels] = useState<RecommendedModel[]>([])
  const [starred, setStarred] = useState<string[]>([])
  const [compareMode, setCompareMode] = useState(false)
  const [compareIds, setCompareIds] = useState<string[]>([])
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null)

  const toggleStar = (id: string) => {
    setStarred((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  const toggleCompare = (id: string) => {
    setCompareIds((prev) =>
      prev.includes(id)
        ? prev.filter((x) => x !== id)
        : prev.length < 3
          ? [...prev, id]
          : prev,
    )
  }

  const selectedForComparison = useMemo(
    () => models.filter((m) => compareIds.includes(m.id)),
    [models, compareIds],
  )

  async function runRecommend() {
    if (!task.trim()) {
      toast.error('Type a task first.')
      return
    }

    setLoading(true)
    try {
      const payload = {
        task,
        privacy,
        latency: maxLatencyMs === 'any' ? 1200 : maxLatencyMs,
        context: minContext === 'any' ? 4000 : minContext,

        // extra fields are safe to send (backend ignores unknown keys)
        // keeping them here so you can later support them server-side
        constraints: {
          maxCostPer1kTokens: maxCostPer1k === 'any' ? null : maxCostPer1k,
          modality: modality === 'any' ? null : modality,
        },
      }

      // ✅ backend route is POST /recommend (NOT /api/recommend)
      const res = await api<RecommendResponseDTO>('/api/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const single = res?.results?.singleModels ?? []

      // flatten to UI models
      let ranked: RecommendedModel[] = single.map((r) => ({
        id: r.model.id,
        name: r.model.name,
        provider: r.model.provider ?? null,
        family: r.model.family ?? null,
        score: r.score ?? 0,
        confidence: r.confidence ?? 0.5,
        contextWindow: r.model.contextWindow ?? null,
        latencyMs: r.model.latencyMs ?? null,
        costPer1kTokens: r.model.costPer1kTokens ?? null,
        modality: r.model.modality ?? null,
        license: r.model.license ?? null,
        domainTags: Array.isArray(r.model.domainTags) ? r.model.domainTags : [],
        arenaElo: r.model.arenaElo ?? null,
        why: Array.isArray(r.why) ? r.why : [],
        warnings: Array.isArray(r.warnings) ? r.warnings : [],
      }))

      // optional: apply client-side filters you have in UI
      if (maxCostPer1k !== 'any') {
        ranked = ranked.filter((m) => (m.costPer1kTokens ?? Infinity) <= maxCostPer1k)
      }
      if (modality !== 'any') {
        ranked = ranked.filter((m) => String(m.modality ?? '') === modality)
      }

      setModels(ranked)

      if (!ranked.length) {
        toast.message(res?.message ?? 'No models matched your constraints.')
      }
    } catch (e: any) {
      console.error(e)
      toast.error(e?.message ?? 'Failed to recommend models')
    } finally {
      setLoading(false)
    }
  }

  if (selectedModelId) {
    return <ModelDetail modelId={selectedModelId} onBack={() => setSelectedModelId(null)} />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Hero */}
      <div className="relative h-80 bg-gradient-to-r from-emerald-900 to-slate-900 overflow-hidden">
        <div className="absolute inset-0 bg-black/10" />
        <div className="relative h-full flex flex-col justify-center items-center text-center px-4">
          <h1 className="text-5xl font-bold text-white mb-4">AI Model Advisor</h1>
          <p className="text-xl text-white/90 max-w-2xl">
            Task-based recommendations ranked by your worker scoring — with Arena Elo shown as benchmark context.
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12 max-w-7xl">
        {/* Task + constraints */}
        <div className="mb-8 space-y-6">
          <div className="relative">
            <Search className="absolute left-4 top-3.5 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Describe your task… e.g. 'Summarise 80-page PDFs and extract risks into a table'"
              value={task}
              onChange={(e) => setTask(e.target.value)}
              className="pl-12 h-12 text-base"
              onKeyDown={(e) => {
                if (e.key === 'Enter') runRecommend()
              }}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-semibold text-foreground">Max Latency</label>
              <Select
                value={String(maxLatencyMs)}
                onValueChange={(v) => setMaxLatencyMs(v === 'any' ? 'any' : Number(v))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any</SelectItem>
                  <SelectItem value="500">≤ 500ms</SelectItem>
                  <SelectItem value="1000">≤ 1000ms</SelectItem>
                  <SelectItem value="2000">≤ 2000ms</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">Min Context</label>
              <Select
                value={String(minContext)}
                onValueChange={(v) => setMinContext(v === 'any' ? 'any' : Number(v))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any</SelectItem>
                  <SelectItem value="8000">8k+</SelectItem>
                  <SelectItem value="32000">32k+</SelectItem>
                  <SelectItem value="128000">128k+</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">Max Cost ($/1k)</label>
              <Select
                value={String(maxCostPer1k)}
                onValueChange={(v) => setMaxCostPer1k(v === 'any' ? 'any' : Number(v))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any</SelectItem>
                  <SelectItem value="0.001">≤ 0.001</SelectItem>
                  <SelectItem value="0.005">≤ 0.005</SelectItem>
                  <SelectItem value="0.02">≤ 0.02</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">Modality</label>
              <Select value={modality} onValueChange={(v) => setModality(v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any</SelectItem>
                  <SelectItem value="text">Text</SelectItem>
                  <SelectItem value="text+image">Text + Image</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">Privacy</label>
              <Select value={privacy} onValueChange={(v) => setPrivacy(v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Any">Any</SelectItem>
                  <SelectItem value="Private">Private</SelectItem>
                  <SelectItem value="OnPrem">On-prem</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 md:col-span-6">
              <label className="text-sm font-semibold text-foreground">Actions</label>
              <div className="flex gap-2">
                <Button className="flex-1" onClick={runRecommend} disabled={loading}>
                  {loading ? 'Ranking…' : 'Recommend'}
                </Button>
                <Button
                  variant={compareMode ? 'default' : 'outline'}
                  onClick={() => {
                    setCompareMode(!compareMode)
                    setCompareIds([])
                  }}
                >
                  <Filter className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Models Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {models.map((model, idx) => {
            const score100 = Math.round((model.score / MAX_SCORE) * 100)

            return (
              <Card
                key={model.id}
                className="overflow-hidden hover:shadow-xl transition-all duration-300 hover:scale-[1.01] cursor-pointer group"
              >
                <div className="p-6">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-400 to-teal-600 text-white font-bold text-lg">
                        {idx + 1}
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-foreground">{model.name}</h3>
                        <p className="text-sm text-muted-foreground">{model.provider ?? '—'}</p>
                      </div>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleStar(model.id)
                      }}
                      className="p-2 hover:bg-secondary rounded-lg transition-colors"
                    >
                      <Star
                        className={`h-5 w-5 ${
                          starred.includes(model.id)
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-muted-foreground'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Score + Confidence */}
                  <div className="flex items-center gap-4 mb-6 pb-6 border-b border-border">
                    <div className="flex-1">
                      <div className="flex items-baseline gap-2">
                        <span className="text-4xl font-bold text-primary">{score100}</span>
                        <span className="text-sm text-muted-foreground">/100</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">Worker Score (normalized)</p>
                      {typeof model.arenaElo === 'number' && (
                        <p className="text-xs text-muted-foreground mt-1">Arena Elo: {model.arenaElo}</p>
                      )}
                    </div>

                    <div className="flex-1">
                      <Badge variant={confidenceBadgeVariant01(model.confidence)}>
                        {confidenceLabel01(model.confidence)}
                      </Badge>
                    </div>
                  </div>

                  {/* Metrics */}
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        <span className="text-xs font-medium">Latency</span>
                      </div>
                      <p className="text-sm font-semibold text-foreground">
                        {typeof model.latencyMs === 'number' ? `${model.latencyMs}ms` : '—'}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <DollarSign className="h-4 w-4" />
                        <span className="text-xs font-medium">Cost</span>
                      </div>
                      <p className="text-sm font-semibold text-foreground">
                        {typeof model.costPer1kTokens === 'number' ? `$${model.costPer1kTokens}/1K` : '—'}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Zap className="h-4 w-4" />
                        <span className="text-xs font-medium">Context</span>
                      </div>
                      <p className="text-sm font-semibold text-foreground">
                        {typeof model.contextWindow === 'number'
                          ? `${model.contextWindow.toLocaleString()}`
                          : '—'}
                      </p>
                    </div>
                  </div>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-2 mb-6">
                    {(model.domainTags ?? []).slice(0, 6).map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3">
                    {compareMode && (
                      <Button
                        variant={compareIds.includes(model.id) ? 'default' : 'outline'}
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleCompare(model.id)
                        }}
                        disabled={!compareIds.includes(model.id) && compareIds.length >= 3}
                        className="flex-1"
                      >
                        {compareIds.includes(model.id) ? 'Selected' : 'Select'}
                      </Button>
                    )}

                    <Button
                      variant="default"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedModelId(model.id)
                      }}
                      className="flex-1"
                    >
                      View Details
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>

        {/* Comparison panel */}
        {compareMode && selectedForComparison.length > 0 && (
          <Card className="p-8 bg-gradient-to-br from-primary/5 to-emerald-500/5 border-primary/20">
            <h2 className="text-2xl font-bold mb-6 text-foreground">Model Comparison</h2>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-secondary/50">
                    <th className="text-left py-3 px-4 font-semibold text-foreground">Metric</th>
                    {selectedForComparison.map((m) => (
                      <th key={m.id} className="text-left py-3 px-4 font-semibold text-foreground">
                        {m.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    { label: 'Worker Score', key: 'score' as const },
                    { label: 'Confidence (0..1)', key: 'confidence' as const },
                    { label: 'Arena Elo', key: 'arenaElo' as const },
                    { label: 'Latency (ms)', key: 'latencyMs' as const },
                    { label: 'Context', key: 'contextWindow' as const },
                    { label: 'Cost ($/1K)', key: 'costPer1kTokens' as const },
                  ].map((metric) => (
                    <tr key={metric.key} className="border-b border-border hover:bg-secondary/50">
                      <td className="py-3 px-4 font-medium text-foreground">{metric.label}</td>
                      {selectedForComparison.map((m) => {
                        const val: any = (m as any)[metric.key]
                        let display = '—'
                        if (metric.key === 'score' && typeof val === 'number') display = `${Math.round(val * 100)}/100`
                        else if (typeof val === 'number') display = String(val)
                        else if (typeof val === 'string') display = val
                        return (
                          <td key={m.id} className="py-3 px-4 text-foreground font-medium">
                            {display}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {models.length === 0 && !loading && (
          <Card className="p-12 text-center">
            <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No recommendations yet</h3>
            <p className="text-muted-foreground">Describe a task above and click Recommend.</p>
          </Card>
        )}
      </div>
    </div>
  )
}