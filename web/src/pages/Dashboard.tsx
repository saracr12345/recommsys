// web/src/pages/Dashboard.tsx
import { useEffect, useState } from 'react'
import { RotateCcw, Trash2, Download, Copy, CheckCircle2, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { api } from '@/lib/api'

type SavedDashboardItem = {
  id: number
  createdAt: string
  eventId: number
  title: string | null
  notes: string | null

  task: string
  privacy: string
  latency: number
  context: number

  topModelName: string | null
  topModelProvider: string | null
  confidence: number | null
}

type SavedResponse = {
  ok: boolean
  items: SavedDashboardItem[]
  error?: string
}

export default function Dashboard() {
  const [items, setItems] = useState<SavedDashboardItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>('')

  const [notesMap, setNotesMap] = useState<Record<number, string>>({})
  const [copied, setCopied] = useState<number | null>(null)

  useEffect(() => {
    void load()
  }, [])

  async function load() {
    try {
      setLoading(true)
      setError('')

      const data = await api<SavedResponse>('/recommendations/saved', { method: 'GET' })
      if (!data.ok) throw new Error(data.error || 'Failed to load saved dashboards')

      const nextItems = data.items ?? []
      setItems(nextItems)

      const initialNotes: Record<number, string> = {}
      for (const it of nextItems) initialNotes[it.id] = it.notes ?? ''
      setNotesMap(initialNotes)
    } catch (e: any) {
      setError(e?.message || 'Error loading dashboard')
    } finally {
      setLoading(false)
    }
  }

  function handleNoteChange(id: number, value: string) {
    setNotesMap((prev) => ({ ...prev, [id]: value }))
  }

  async function persistNote(id: number) {
    const notes = notesMap[id] ?? ''
    try {
      await api<{ ok: boolean }>(`/recommendations/saved/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ notes }),
      })
    } catch (e) {
      console.error('failed to save note', e)
    }
  }

  function copyRationale(item: SavedDashboardItem) {
    const rationale = [
      `Task: ${item.task || '—'}`,
      `Privacy: ${item.privacy || '—'}`,
      `Latency target: ${item.latency} ms`,
      `Context needed: ${item.context.toLocaleString()} tokens`,
      `Top model: ${item.topModelName ?? '—'} (${item.topModelProvider ?? 'Unknown'})`,
      `Confidence: ${item.confidence != null ? item.confidence.toFixed(2) : '—'}`,
      notesMap[item.id] ? `Notes: ${notesMap[item.id]}` : '',
    ]
      .filter(Boolean)
      .join('\n')

    if (navigator.clipboard && navigator.clipboard.writeText) {
      void navigator.clipboard.writeText(rationale)
      setCopied(item.id)
      window.setTimeout(() => setCopied(null), 2000)
    } else {
      alert('Clipboard not available in this browser')
    }
  }

  function exportPdfPlaceholder() {
    window.print()
  }

  async function removeCard(id: number) {
    try {
      await api<{ ok: boolean }>(`/recommendations/saved/${id}`, { method: 'DELETE' })
      setItems((prev) => prev.filter((x) => x.id !== id))

      // keep notesMap tidy (optional)
      setNotesMap((prev) => {
        const next = { ...prev }
        delete next[id]
        return next
      })
    } catch (e) {
      console.error('failed to delete card', e)
    }
  }

  const savedCount = items.length

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50/20 to-slate-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold text-slate-900 mb-2">Dashboard</h1>
              <p className="text-slate-600 text-sm max-w-2xl">
                Your saved LLM Advisor dashboards. Use the{' '}
                <span className="font-semibold text-emerald-700">Save</span> button on a recommendation to pin it here.
              </p>
            </div>

            <button
              onClick={() => void load()}
              disabled={loading}
              type="button"
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-full font-semibold transition-all duration-200',
                loading
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed opacity-50'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-700 shadow-sm',
              )}
            >
              <RotateCcw className="w-4 h-4" />
              {loading ? 'Refreshing…' : 'Refresh'}
            </button>
          </div>

          {/* Error */}
          {error && (
            <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm font-medium flex items-start gap-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div>{error}</div>
            </div>
          )}

          {/* Empty */}
          {!loading && !error && items.length === 0 && (
            <div className="p-6 rounded-lg bg-slate-50 border border-slate-200 text-slate-600 text-sm">
              <p>
                No saved dashboards yet. In the{' '}
                <span className="font-semibold text-slate-900">Recommend</span> tab, click{' '}
                <span className="font-semibold text-emerald-700">Save</span> on a model to add it here.
              </p>
            </div>
          )}
        </div>

        {/* Cards */}
        <div className="space-y-6">
          {items.map((item) => {
            const created = new Date(item.createdAt)
            const dateStr = created.toLocaleString()
            const score = item.confidence != null ? item.confidence.toFixed(2) : '—'
            const noteVal = notesMap[item.id] ?? ''

            const constraints = [
              item.privacy ? item.privacy.toLowerCase() : '',
              item.latency ? `latency ≤ ${item.latency} ms` : '',
              item.context ? `context ≥ ${item.context.toLocaleString()} tokens` : '',
            ]
              .filter(Boolean)
              .join('; ')

            return (
              <div
                key={item.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden"
              >
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-8">
                  {/* LEFT */}
                  <div className="lg:border-r border-slate-200 lg:pr-6 space-y-6">
                    <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Saved {dateStr}
                    </div>

                    <div>
                      <h3 className="text-sm font-bold text-slate-900 mb-2">Task</h3>
                      <p className="text-sm text-slate-600 leading-relaxed">{item.task || '—'}</p>
                    </div>

                    <div>
                      <h3 className="text-sm font-bold text-slate-900 mb-2">Constraints</h3>
                      <p className="text-sm text-slate-600 leading-relaxed">{constraints || '—'}</p>
                    </div>

                    <div>
                      <h3 className="text-sm font-bold text-slate-900 mb-2">Total Saved</h3>
                      <p className="text-sm text-slate-600">{savedCount === 1 ? '1 item' : `${savedCount} items`}</p>
                    </div>
                  </div>

                  {/* MIDDLE */}
                  <div className="lg:border-r border-slate-200 lg:pr-6 space-y-6">
                    <div className="bg-gradient-to-br from-emerald-50 to-emerald-50/50 rounded-xl p-4 border border-emerald-200">
                      <div className="flex items-start justify-between gap-4 mb-4">
                        <div>
                          <div className="text-xs font-semibold text-emerald-700 uppercase tracking-wider mb-1">
                            Recommended
                          </div>
                          <div className="text-lg font-bold text-emerald-900">
                            {item.topModelName ?? '—'}
                            {item.topModelProvider ? ` (${item.topModelProvider})` : ''}
                          </div>
                          <div className="text-xs text-emerald-700 mt-1">Privacy: {item.privacy || '—'}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">Score</div>
                          <div className="text-2xl font-bold text-emerald-900">{score}</div>
                        </div>
                      </div>

                      <div className="space-y-2 text-sm">
                        <p className="text-slate-700">
                          <span className="font-semibold">Pros:</span> —
                        </p>
                        <p className="text-slate-700">
                          <span className="font-semibold">Cons:</span> —
                        </p>
                        <p className="text-slate-700">
                          <span className="font-semibold">Cost &amp; Latency:</span> $0 per 1M tokens (compute only);
                          target {item.latency ? `${item.latency} ms` : '—'}
                        </p>
                        <p className="text-slate-700">
                          <span className="font-semibold">RAG tip:</span> —
                        </p>
                        <p className="text-slate-700">
                          <span className="font-semibold">Sources:</span> —
                        </p>
                      </div>
                    </div>

                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                      <h4 className="text-sm font-bold text-slate-900 mb-1">Evidence Summary</h4>
                      <p className="text-xs text-slate-600 mb-4">Benchmarks, metadata, and popularity for this task.</p>

                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="border-b border-slate-300">
                              <th className="text-left py-2 px-2 font-semibold text-slate-700">Model</th>
                              <th className="text-left py-2 px-2 font-semibold text-slate-700">TaskFit</th>
                              <th className="text-left py-2 px-2 font-semibold text-slate-700">Cost $/1M</th>
                              <th className="text-left py-2 px-2 font-semibold text-slate-700">Latency</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200">
                            <tr>
                              <td className="py-2 px-2 text-slate-900">{item.topModelName ?? '—'}</td>
                              <td className="py-2 px-2 text-slate-600">—</td>
                              <td className="py-2 px-2 text-slate-600">—</td>
                              <td className="py-2 px-2 text-slate-600">{item.latency ? `${item.latency} ms` : '—'}</td>
                            </tr>
                            <tr>
                              <td className="py-2 px-2 text-slate-900">—</td>
                              <td className="py-2 px-2 text-slate-600">—</td>
                              <td className="py-2 px-2 text-slate-600">—</td>
                              <td className="py-2 px-2 text-slate-600">—</td>
                            </tr>
                            <tr>
                              <td className="py-2 px-2 text-slate-900">—</td>
                              <td className="py-2 px-2 text-slate-600">—</td>
                              <td className="py-2 px-2 text-slate-600">—</td>
                              <td className="py-2 px-2 text-slate-600">—</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>

                  {/* RIGHT */}
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 mb-3">Compare</h3>
                      <div className="space-y-2">
                        <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-700 hover:text-emerald-700 transition-colors">
                          <input type="checkbox" defaultChecked className="w-4 h-4 rounded border-slate-300" />
                          <span>
                            {item.topModelName ?? 'Top model'} — score {score}
                          </span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-700 hover:text-emerald-700 transition-colors">
                          <input type="checkbox" className="w-4 h-4 rounded border-slate-300" />
                          <span>(slot 2) — score —</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-700 hover:text-emerald-700 transition-colors">
                          <input type="checkbox" className="w-4 h-4 rounded border-slate-300" />
                          <span>(slot 3) — score —</span>
                        </label>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-sm font-bold text-slate-900 mb-3">Actions</h3>
                      <div className="space-y-2">
                        <button
                          type="button"
                          onClick={() => void removeCard(item.id)}
                          className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-red-50 border border-red-200 text-red-700 font-semibold text-sm hover:bg-red-100 transition-all duration-200"
                        >
                          <Trash2 className="w-4 h-4" />
                          Remove
                        </button>

                        <button
                          type="button"
                          onClick={exportPdfPlaceholder}
                          className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 font-semibold text-sm hover:bg-blue-100 transition-all duration-200"
                        >
                          <Download className="w-4 h-4" />
                          Export PDF
                        </button>

                        <button
                          type="button"
                          onClick={() => copyRationale(item)}
                          className={cn(
                            'w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm transition-all duration-200',
                            copied === item.id
                              ? 'bg-emerald-100 border border-emerald-300 text-emerald-700'
                              : 'bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100',
                          )}
                        >
                          {copied === item.id ? (
                            <>
                              <CheckCircle2 className="w-4 h-4" />
                              Copied!
                            </>
                          ) : (
                            <>
                              <Copy className="w-4 h-4" />
                              Copy Rationale
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-sm font-bold text-slate-900 mb-3">Notes</h3>
                      <textarea
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all resize-none"
                        placeholder="Add a comment for audit trail…"
                        rows={4}
                        value={noteVal}
                        onChange={(e) => handleNoteChange(item.id, e.target.value)}
                        onBlur={() => void persistNote(item.id)}
                      />
                    </div>

                    <div>
                      <h3 className="text-sm font-bold text-slate-900 mb-3">Context Limits</h3>
                      <ul className="space-y-1 text-sm text-slate-700">
                        <li>• Top model: {item.context.toLocaleString()} tokens</li>
                        <li>• Slot 2: —</li>
                        <li>• Slot 3: —</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}