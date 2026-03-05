// web/src/pages/ModelDetail.tsx
import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Star, Copy, Check } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

import { api } from '@/lib/api'

interface ModelDetailProps {
  modelId: string
  onBack: () => void
}

type ModelDetailDTO = {
  id: string
  name: string
  provider: string | null
  family: string | null
  contextWindow: number | null
  latencyMs: number | null
  costPer1kTokens: number | null
  apiType: string | null
  modality: string | null
  license: string | null
  domainTags: any
  pros: any
  cons: any
  ragTips: any
  typicalUseCases: any
  strengths: any
  limitations: any
  source: string | null
  url: string | null
  arenaElo: number | null
  arenaConfidence: string | null
  arenaRecordedAt: string | null
}

type Resp = { ok: boolean; model: ModelDetailDTO; error?: string }

function arr(x: any): string[] {
  if (Array.isArray(x)) return x.map((v) => String(v))
  return []
}

export default function ModelDetail({ modelId, onBack }: ModelDetailProps) {
  const [loading, setLoading] = useState(true)
  const [model, setModel] = useState<ModelDetailDTO | null>(null)

  const [isStarred, setIsStarred] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    ;(async () => {
      try {
        setLoading(true)
        const data = await api<Resp>(`/api/models/${encodeURIComponent(modelId)}`, { method: 'GET' })
        if (!data.ok) throw new Error(data.error || 'Failed to load model')
        setModel(data.model)
      } catch (e: any) {
        console.error(e)
        toast.error(e?.message || 'Failed to load model')
      } finally {
        setLoading(false)
      }
    })()
  }, [modelId])

  const tags = useMemo(() => (model ? arr(model.domainTags) : []), [model])
  const pros = useMemo(() => (model ? arr(model.pros) : []), [model])
  const cons = useMemo(() => (model ? arr(model.cons) : []), [model])
  const ragTips = useMemo(() => (model ? arr(model.ragTips) : []), [model])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4">
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">Loading…</p>
        </Card>
      </div>
    )
  }

  if (!model) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4">
        <Button variant="ghost" onClick={onBack} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Leaderboard
        </Button>
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">Model not found</p>
        </Card>
      </div>
    )
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(`${model.name} (${model.id})`)
    setCopied(true)
    toast.success('Copied')
    setTimeout(() => setCopied(false), 1200)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div className="border-b border-border bg-white">
        <div className="container mx-auto max-w-6xl px-4 py-6">
          <Button variant="ghost" onClick={onBack} className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Leaderboard
          </Button>

          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-400 to-teal-600 text-2xl font-bold text-white">
                {model.name?.[0] ?? 'M'}
              </div>

              <div>
                <h1 className="mb-2 text-4xl font-bold text-foreground">{model.name}</h1>
                <p className="mb-3 text-lg text-muted-foreground">{model.provider ?? '—'}</p>

                <div className="flex flex-wrap gap-2">
                  {tags.slice(0, 12).map((t) => (
                    <Badge key={t} variant="outline">
                      {t}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            <div className="text-right">
              <div className="mb-2 text-5xl font-bold text-primary">
                {model.arenaElo == null ? '—' : Math.round(model.arenaElo)}
              </div>
              <p className="mb-4 text-sm text-muted-foreground">Arena Elo</p>

              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => setIsStarred(!isStarred)}>
                  <Star className={`h-4 w-4 ${isStarred ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'}`} />
                </Button>

                <Button variant="outline" size="sm" onClick={copyToClipboard}>
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </div>

          {/* Specs row */}
          <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
            <Card className="p-4">
              <p className="text-xs font-semibold uppercase text-muted-foreground">Latency</p>
              <p className="mt-1 text-sm font-semibold text-foreground">{model.latencyMs == null ? '—' : `${model.latencyMs} ms`}</p>
            </Card>
            <Card className="p-4">
              <p className="text-xs font-semibold uppercase text-muted-foreground">Cost</p>
              <p className="mt-1 text-sm font-semibold text-foreground">
                {model.costPer1kTokens == null ? '—' : `$${model.costPer1kTokens}/1K`}
              </p>
            </Card>
            <Card className="p-4">
              <p className="text-xs font-semibold uppercase text-muted-foreground">Context</p>
              <p className="mt-1 text-sm font-semibold text-foreground">
                {model.contextWindow == null ? '—' : `${model.contextWindow.toLocaleString()} tokens`}
              </p>
            </Card>
            <Card className="p-4">
              <p className="text-xs font-semibold uppercase text-muted-foreground">Modality</p>
              <p className="mt-1 text-sm font-semibold text-foreground">{model.modality ?? '—'}</p>
            </Card>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto max-w-6xl space-y-6 px-4 py-8">
        <Card className="p-8">
          <h2 className="mb-4 text-2xl font-bold text-foreground">Model Card</h2>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <h3 className="mb-2 font-semibold text-foreground">Pros</h3>
              <ul className="space-y-2">
                {pros.length ? pros.map((p) => <li key={p}>✓ {p}</li>) : <li className="text-muted-foreground">—</li>}
              </ul>
            </div>

            <div>
              <h3 className="mb-2 font-semibold text-foreground">Cons</h3>
              <ul className="space-y-2">
                {cons.length ? cons.map((c) => <li key={c}>✕ {c}</li>) : <li className="text-muted-foreground">—</li>}
              </ul>
            </div>
          </div>

          <div className="mt-6">
            <h3 className="mb-2 font-semibold text-foreground">RAG Tips</h3>
            <ul className="space-y-2">
              {ragTips.length ? ragTips.map((t) => <li key={t}>• {t}</li>) : <li className="text-muted-foreground">—</li>}
            </ul>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <span>Confidence: {model.arenaConfidence ?? '—'}</span>
            <span>Recorded: {model.arenaRecordedAt ?? '—'}</span>
            {model.url ? (
              <a className="text-emerald-700 hover:underline" href={model.url} target="_blank" rel="noreferrer">
                Docs
              </a>
            ) : null}
          </div>
        </Card>
      </div>
    </div>
  )
}