// Enhanced LLM Advisor - Premium UI (fixed + wired to your real api client)
import { useEffect, useMemo, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { api } from '@/lib/api'
import {
  Sparkles,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Star,
  Zap,
  Target,
  ShieldCheck,
} from 'lucide-react'

const MAX_SCORE = 1 // backend score is 0..1

type AdvisorModel = {
  name: string
  provider: string
  context: number
  latencyMs: number | null
  costPer1kTokens: number | null
  tags: string[]
  apiType?: string | null
  modality?: string | null
  pros?: string[]
  cons?: string[]
  ragTip?: string
  sources?: string[]
}

type AdvisorFactors = {
  ctxScore: number
  latencyScore: number
  costScore: number
  domainScore: number
  unknownPenalty: number
}

type AdvisorResult = {
  model: AdvisorModel
  score: number // 0..1
  confidence?: number
  factors?: AdvisorFactors
  why?: string[]
  warnings?: string[]
}

type PipelineStep = {
  role: string
  model: AdvisorModel
  rationale: string[]
  suggestedConfig: {
    temperature: number
    maxOutputTokens: number
    structuredOutput: boolean
    citationsRequired: boolean
  }
  promptHint: string
}

type RecommendedPipeline = {
  label: string
  steps: PipelineStep[]
  notes: string[]
}

type RecommendResponse = {
  ok: boolean
  eventId: number | null
  results: {
    singleModels: AdvisorResult[]
    recommendedPipeline?: RecommendedPipeline | null
  }
  message?: string
}

type SavedListResponse = {
  ok: boolean
  items: { id: number }[]
}

export default function EnhancedLLMAdvisor() {
  const [task, setTask] = useState('financial sentiment')
  const [privacy, setPrivacy] = useState<'Self-host' | 'Cloud' | 'Any'>('Self-host')
  const [latency, setLatency] = useState(1200)
  const [ctx, setCtx] = useState(4000)
  const [loading, setLoading] = useState(false)

  const [singleModels, setSingleModels] = useState<AdvisorResult[]>([])
  const [pipeline, setPipeline] = useState<RecommendedPipeline | null>(null)

  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const [eventId, setEventId] = useState<number | null>(null)
  const [runSaved, setRunSaved] = useState(false)
  const [savedCount, setSavedCount] = useState(0)

  // load total saved count once
  useEffect(() => {
    ;(async () => {
      try {
        const data = await api<SavedListResponse>('/recommendations/saved', { method: 'GET' })
        if (data.ok) setSavedCount(data.items?.length ?? 0)
      } catch {
        // ignore
      }
    })()
  }, [])

  async function recommend() {
    setLoading(true)
    setError('')
    setMessage('')

    setSingleModels([])
    setPipeline(null)
    setEventId(null)
    setRunSaved(false)

    try {
      const data = await api<RecommendResponse>('/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task,
          privacy,
          latency,
          context: ctx,
        }),
      })

      if (!data.ok) throw new Error('Recommendation failed')

      setSingleModels(data.results?.singleModels ?? [])
      setPipeline(data.results?.recommendedPipeline ?? null)
      setEventId(data.eventId ?? null)
      setMessage(data.message ?? '')
    } catch (e: any) {
      setError(e?.message || 'Error')
    } finally {
      setLoading(false)
    }
  }

  async function toggleSaveCurrentRun() {
    if (!eventId) return
    try {
      const data = await api<{ ok: boolean; saved: boolean; savedCount: number }>(
        '/recommendations/saved',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ eventId }),
        },
      )

      if (!data.ok) throw new Error('Failed to toggle save')

      setRunSaved(data.saved)
      setSavedCount(data.savedCount)
    } catch (e) {
      console.error('failed to toggle save', e)
    }
  }

  const ranked = useMemo(() => singleModels.slice(0, 10), [singleModels])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50/30 to-slate-50 py-12 px-4">
      <div className="mx-auto w-full max-w-3xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mb-4 flex items-center justify-center gap-3">
            <div className="rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 p-3 shadow-lg">
              <Zap className="h-6 w-6 text-white" />
            </div>
            <h1 className="bg-gradient-to-r from-emerald-600 to-emerald-700 bg-clip-text text-4xl font-bold text-transparent">
              LLM Advisor
            </h1>
          </div>

          <p className="mb-2 text-lg text-slate-600">Input your task → get the best model ranked for you.</p>

          <div className="flex items-center justify-center gap-2 text-sm text-slate-500">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <span className="font-medium">
              {savedCount} saved dashboard{savedCount !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {/* Main Form Card */}
        <Card className="mb-8 bg-white/95 shadow-lg backdrop-blur-sm transition-shadow hover:shadow-xl">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-emerald-700">
              <Target className="h-5 w-5" />
              Configure Your Search
            </CardTitle>
            <CardDescription>Specify your requirements and let the system rank models for you.</CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {/* Task */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <Sparkles className="h-4 w-4 text-emerald-600" />
                  Task
                </label>
                <input
                  value={task}
                  onChange={(e) => setTask(e.target.value)}
                  placeholder="e.g. summarise filings, classify news, extract fields"
                  className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-slate-900 placeholder-slate-400 outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Privacy */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  Privacy
                </label>
                <select
                  value={privacy}
                  onChange={(e) => setPrivacy(e.target.value as any)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-slate-900 outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-emerald-500"
                >
                  <option>Self-host</option>
                  <option>Cloud</option>
                  <option>Any</option>
                </select>
              </div>

              {/* Latency */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <TrendingUp className="h-4 w-4 text-emerald-600" />
                  Latency target (ms)
                </label>
                <input
                  type="number"
                  value={latency}
                  onChange={(e) => setLatency(parseInt(e.target.value || '0', 10))}
                  className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-slate-900 outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Context */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <Target className="h-4 w-4 text-emerald-600" />
                  Context tokens needed
                </label>
                <input
                  type="number"
                  value={ctx}
                  onChange={(e) => setCtx(parseInt(e.target.value || '0', 10))}
                  className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-slate-900 outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col items-center justify-center gap-3 pt-4 sm:flex-row">
              <Button
                onClick={recommend}
                disabled={loading}
                className="w-full bg-gradient-to-r from-emerald-600 to-emerald-700 px-8 py-3 font-semibold text-white shadow-lg transition-all hover:from-emerald-700 hover:to-emerald-800 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
              >
                {loading ? (
                  <>
                    <span className="mr-2 animate-spin">⚙️</span>
                    Thinking…
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Recommend Models
                  </>
                )}
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={() => void toggleSaveCurrentRun()}
                disabled={!eventId}
                className={cn(
                  'w-full gap-2 rounded-lg border-slate-200 bg-white px-6 py-3 font-semibold transition-all sm:w-auto',
                  runSaved
                    ? 'border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100'
                    : 'text-slate-700 hover:bg-slate-50',
                )}
                title="Save / unsave this recommendation run"
              >
                <Star className={cn('h-4 w-4', runSaved && 'fill-current')} />
                {runSaved ? 'Saved run' : 'Save run'}
              </Button>
            </div>

            {error && (
              <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50/50 p-4">
                <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-600" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {message && !error && (
              <div className="flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50/50 p-4">
                <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-600" />
                <p className="text-sm text-emerald-700">{message}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pipeline */}
        {pipeline && (
          <Card className="mb-6 border-emerald-200 bg-gradient-to-br from-emerald-50 to-emerald-50/50 shadow-lg transition-shadow hover:shadow-xl">
            <CardHeader className="border-b border-emerald-200 pb-4">
              <CardTitle className="flex items-center gap-2 text-emerald-700">
                <TrendingUp className="h-5 w-5" />
                {safe(pipeline.label)}
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-6 pt-6">
              {pipeline.steps?.map((step, idx) => (
                <div
                  key={step.role}
                  className="border-b border-emerald-100 pb-6 last:border-0 last:pb-0"
                >
                  <div className="mb-4 flex items-start gap-3">
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-emerald-600 text-sm font-bold text-white">
                      {idx + 1}
                    </div>
                    <div className="flex-1">
                      <h4 className="text-lg font-bold text-slate-900">{safe(step.role)}</h4>
                      <p className="mt-1 text-sm text-slate-600">
                        {safe(step.model.name)} • {safe(step.model.provider)}
                      </p>
                    </div>
                  </div>

                  <div className="ml-11 space-y-3">
                    <div className="text-sm">
                      <span className="font-semibold text-slate-700">Hosting:</span>
                      <span className="ml-2 text-slate-600">{prettyApiType(step.model.apiType)}</span>
                    </div>

                    {!!step.rationale?.length && (
                      <div>
                        <p className="mb-2 text-sm font-semibold text-slate-700">Why this step:</p>
                        <ul className="space-y-1">
                          {step.rationale.map((r) => (
                            <li key={r} className="flex items-start gap-2 text-sm text-slate-600">
                              <span className="mt-0.5 font-bold text-emerald-600">•</span>
                              <span>{r}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className="rounded-lg bg-white/60 p-3 font-mono text-xs text-slate-600">
                      <p className="mb-2 font-semibold text-slate-700">Suggested config:</p>
                      <div className="space-y-1">
                        <div>temp={step.suggestedConfig.temperature}</div>
                        <div>maxOut={step.suggestedConfig.maxOutputTokens}</div>
                        <div>structured={String(step.suggestedConfig.structuredOutput)}</div>
                        <div>citations={String(step.suggestedConfig.citationsRequired)}</div>
                      </div>
                    </div>

                    <div>
                      <p className="mb-1 text-sm font-semibold text-slate-700">Prompt hint:</p>
                      <p className="text-sm italic text-slate-600">{safe(step.promptHint)}</p>
                    </div>
                  </div>
                </div>
              ))}

              {!!pipeline.notes?.length && (
                <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-4">
                  <p className="mb-2 text-sm font-semibold text-blue-900">📝 Notes</p>
                  <ul className="space-y-1">
                    {pipeline.notes.map((note) => (
                      <li key={note} className="flex items-start gap-2 text-sm text-blue-800">
                        <span className="mt-0.5 font-bold text-blue-600">•</span>
                        <span>{note}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Empty */}
        {ranked.length === 0 && !loading && !message && (
          <Card className="border-slate-200 bg-slate-50/50">
            <CardContent className="py-12 text-center">
              <Sparkles className="mx-auto mb-4 h-12 w-12 text-slate-300" />
              <p className="text-sm text-slate-500">Run a recommendation to see ranked models here.</p>
            </CardContent>
          </Card>
        )}

        {/* Results */}
        <div className="space-y-6">
          {ranked.map((res, idx) => {
            const pct = scorePercent(res)
            const model = res.model ?? ({} as AdvisorModel)
            const pros = model.pros ?? []
            const cons = model.cons ?? []
            const warnings = res.warnings ?? []
            const sourcesStr = (model.sources ?? []).join('; ')
            const confLabel = confidenceLabel(res.confidence)

            return (
              <Card
                key={idx}
                className={cn(
                  'overflow-hidden border-slate-200 bg-gradient-to-br from-white to-slate-50 shadow-md transition-all duration-300 hover:scale-[1.01] hover:border-emerald-300 hover:shadow-lg',
                )}
              >
                <CardContent className="pt-6">
                  {/* Header */}
                  <div className="mb-4 flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="mb-2 flex items-center gap-3">
                        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 text-lg font-bold text-white">
                          {idx + 1}
                        </div>
                        <h3 className="text-xl font-bold text-slate-900">{safe(model.name)}</h3>
                      </div>
                      <p className="text-sm text-slate-600">Provider: {safe(model.provider)}</p>
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      <div className="text-right">
                        <div className="text-3xl font-bold text-emerald-600">{pct ?? 0}%</div>
                        <div className="text-xs font-medium text-slate-500">Score</div>
                      </div>

                      <Badge className={getConfidenceBadgeColor(res.confidence)}>
                        {confLabel ? `Confidence: ${confLabel}` : 'Confidence: Unknown'}
                      </Badge>
                    </div>
                  </div>

                  {/* Specs */}
                  <div className="mb-4 grid grid-cols-2 gap-3 border-b border-slate-200 pb-4">
                    <Spec label="Privacy" value={prettyApiType(model.apiType) || '—'} />
                    <Spec label="Context" value={model.context ? `${model.context.toLocaleString()} tokens` : '—'} />
                    <Spec label="Latency" value={model.latencyMs == null ? 'Unknown' : `${model.latencyMs} ms`} />
                    <Spec
                      label="Cost"
                      value={
                        model.costPer1kTokens == null
                          ? 'Unknown'
                          : `$${model.costPer1kTokens}/1k`
                      }
                    />
                  </div>

                  {/* Modality */}
                  {model.modality && (
                    <div className="mb-4 border-b border-slate-200 pb-4">
                      <Badge variant="outline" className="border-slate-300 text-slate-700">
                        {model.modality}
                      </Badge>
                    </div>
                  )}

                  {/* Why */}
                  {!!res.why?.length && (
                    <div className="mb-4 border-b border-slate-200 pb-4">
                      <p className="mb-2 text-sm font-semibold text-slate-900">Why this model:</p>
                      <ul className="space-y-1">
                        {res.why.map((w) => (
                          <li key={w} className="flex items-start gap-2 text-sm text-slate-600">
                            <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-600" />
                            <span>{w}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Pros / Cons */}
                  <div className="mb-4 grid grid-cols-1 gap-4 border-b border-slate-200 pb-4 md:grid-cols-2">
                    <div>
                      <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-900">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        Pros
                      </p>
                      <ul className="space-y-1">
                        {pros.length ? (
                          pros.map((p) => (
                            <li key={p} className="text-sm text-slate-600">
                              ✓ {p}
                            </li>
                          ))
                        ) : (
                          <li className="text-sm italic text-slate-400">—</li>
                        )}
                      </ul>
                    </div>

                    <div>
                      <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-900">
                        <AlertCircle className="h-4 w-4 text-orange-600" />
                        Cons
                      </p>
                      <ul className="space-y-1">
                        {cons.length ? (
                          cons.map((c) => (
                            <li key={c} className="text-sm text-slate-600">
                              ✗ {c}
                            </li>
                          ))
                        ) : (
                          <li className="text-sm italic text-slate-400">—</li>
                        )}
                      </ul>
                    </div>
                  </div>

                  {/* RAG / Sources */}
                  <div className="mb-4 space-y-2 border-b border-slate-200 pb-4">
                    {model.ragTip && (
                      <div>
                        <p className="text-sm font-semibold text-slate-900">💡 RAG Tip</p>
                        <p className="mt-1 text-sm text-slate-600">{safe(model.ragTip)}</p>
                      </div>
                    )}
                    {sourcesStr && (
                      <div>
                        <p className="text-sm font-semibold text-slate-900">📚 Sources</p>
                        <p className="mt-1 text-sm text-slate-600">{safe(sourcesStr)}</p>
                      </div>
                    )}
                  </div>

                  {/* Tags */}
                  {!!model.tags?.length && (
                    <div className="mb-4 border-b border-slate-200 pb-4">
                      <p className="mb-2 text-sm font-semibold text-slate-900">Tags</p>
                      <div className="flex flex-wrap gap-2">
                        {model.tags.map((tag) => (
                          <Badge key={tag} variant="secondary" className="bg-emerald-100 text-emerald-700">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Warnings */}
                  {!!warnings.length && (
                    <div className="rounded-lg border border-red-200 bg-red-50/50 p-3">
                      <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-red-900">
                        <AlertCircle className="h-4 w-4" />
                        Warnings
                      </p>
                      <ul className="space-y-1">
                        {warnings.map((w) => (
                          <li key={w} className="flex items-start gap-2 text-sm text-red-700">
                            <span className="mt-0.5 font-bold text-red-600">⚠</span>
                            <span>{w}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function Spec({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-50 p-3">
      <p className="text-xs font-semibold uppercase text-slate-600">{label}</p>
      <p className="mt-1 text-sm font-medium text-slate-900">{value}</p>
    </div>
  )
}

/* ---------- helpers ---------- */

function safe(v: any): string {
  if (v == null) return ''
  const s = String(v)
  return s === 'undefined' || s === 'null' ? '' : s
}

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n))
}

function confidenceLabel(conf?: number): string {
  if (conf == null) return ''
  if (conf >= 0.75) return 'High'
  if (conf >= 0.5) return 'Medium'
  return 'Low'
}

function scorePercent(res: AdvisorResult): number | null {
  if (res.score == null) return null
  return clamp(Math.round((res.score / MAX_SCORE) * 100), 0, 100)
}

function prettyApiType(apiType?: string | null): string {
  if (!apiType) return ''
  const v = apiType.toLowerCase()
  if (v === 'saas') return 'Cloud (SaaS)'
  if (v === 'self-hosted') return 'Self-hosted'
  if (v === 'open-source') return 'Open-source / self-host'
  return apiType
}

function getConfidenceBadgeColor(conf?: number): string {
  if (conf == null) return 'bg-slate-100 text-slate-700'
  if (conf >= 0.75) return 'bg-emerald-100 text-emerald-700'
  if (conf >= 0.5) return 'bg-amber-100 text-amber-700'
  return 'bg-orange-100 text-orange-700'
}