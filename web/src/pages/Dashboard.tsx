import { useEffect, useState, type CSSProperties } from 'react'
import { pageShell, card, primaryButton, colors } from '@/ui/styles'
import { api } from '@/lib/api'

type SavedDashboardItem = {
  id: number;          // SavedRecommendation id
  createdAt: string;
  eventId: number;
  title: string | null;
  notes: string | null;

  task: string;
  privacy: string;
  latency: number;
  context: number;

  topModelName: string | null;
  topModelProvider: string | null;
  confidence: number | null;
};


type SavedResponse = {
  ok: boolean
  items: SavedDashboardItem[]
}

export default function Dashboard() {
  const [items, setItems] = useState<SavedDashboardItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>('')

  const [notesMap, setNotesMap] = useState<Record<number, string>>({})

  useEffect(() => {
    void load()
  }, [])

  async function load() {
    try {
      setLoading(true)
      setError('')

      const data = await api<SavedResponse>('/recommendations/saved', {
        method: 'GET',
      })

      if (!data.ok) throw new Error('Failed to load saved dashboards')

      setItems(data.items ?? [])

      const initialNotes: Record<number, string> = {}
      for (const it of data.items ?? []) {
        initialNotes[it.id] = it.notes ?? ''
      }
      setNotesMap(initialNotes)
    } catch (e: any) {
      setError(e.message || 'Error')
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
      `Confidence: ${
        item.confidence != null ? item.confidence.toFixed(2) : '—'
      }`,
      notesMap[item.id] ? `Notes: ${notesMap[item.id]}` : '',
    ]
      .filter(Boolean)
      .join('\n')

    if (navigator.clipboard && navigator.clipboard.writeText) {
      void navigator.clipboard.writeText(rationale)
      alert('Rationale copied to clipboard')
    } else {
      alert('Clipboard not available in this browser')
    }
  }

  function exportPdfPlaceholder() {
    window.print()
  }

  async function removeCard(id: number) {
    try {
      await api<{ ok: boolean }>(`/recommendations/saved/${id}`, {
        method: 'DELETE',
      })
      setItems((prev) => prev.filter((x) => x.id !== id))
    } catch (e) {
      console.error('failed to delete card', e)
    }
  }

  const savedCount = items.length

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        <div style={{ marginBottom: 12 }}>
          <h2
            style={{
              margin: 0,
              fontSize: 20,
              fontWeight: 700,
              color: colors.textMain,
            }}
          >
            Dashboard
          </h2>
          <p
            style={{
              marginTop: 6,
              marginBottom: 0,
              fontSize: 14,
              color: colors.textMuted,
            }}
          >
            Your saved LLM Advisor dashboards. Use the <b>Save</b> button on a
            recommendation to pin it here.
          </p>
        </div>

        <button
          onClick={load}
          disabled={loading}
          style={{
            ...secondaryRefreshButton,
            opacity: loading ? 0.7 : 1,
            cursor: loading ? 'default' : 'pointer',
          }}
        >
          {loading ? 'Refreshing…' : 'Refresh'}
        </button>

        {error && <div style={errorBox}>{error}</div>}

        {!loading && !error && items.length === 0 && (
          <div
            style={{
              fontSize: 13,
              color: colors.textMuted,
              marginTop: 8,
            }}
          >
            No saved dashboards yet. In the <b>Recommend</b> tab, click
            &nbsp;<b>Save</b> on a model to add it here.
          </div>
        )}

        <div style={{ display: 'grid', gap: 14, marginTop: 10 }}>
          {items.map((item) => {
            const created = new Date(item.createdAt)
            const dateStr = created.toLocaleString()
            const score =
              item.confidence != null
                ? item.confidence.toFixed(2)
                : '—'

            const noteVal = notesMap[item.id] ?? ''

            const constraints = [
              item.privacy ? item.privacy.toLowerCase() : '',
              item.latency ? `latency ≤ ${item.latency} ms` : '',
              item.context ? `context ≥ ${item.context.toLocaleString()} tokens` : '',
            ]
              .filter(Boolean)
              .join('; ')

            return (
              <div key={item.id} style={dashboardCard}>
                {/* LEFT COLUMN – Task / Constraints / History / Saved */}
                <div style={leftCol}>
                  <div style={smallMeta}>Saved at: {dateStr}</div>

                  <h3 style={sectionTitle}>Task</h3>
                  <p style={sectionBody}>{item.task || '—'}</p>

                  <h3 style={sectionTitle}>Constraints</h3>
                  <p style={sectionBody}>{constraints || '—'}</p>

                  <h3 style={sectionTitle}>History</h3>
                  <p style={sectionBody}>—</p>

                  <h3 style={sectionTitle}>Saved</h3>
                  <p style={sectionBody}>
                    {savedCount === 1 ? '1 item' : `${savedCount} items`}
                  </p>
                </div>

                {/* MIDDLE COLUMN – Recommended model + Evidence summary */}
                <div style={middleCol}>
                  <div style={{ marginBottom: 10 }}>
                    <div style={middleHeader}>
                      <div>
                        <div style={middleTitle}>
                          Recommended:{' '}
                          {item.topModelName ?? '—'}
                          {item.topModelProvider
                            ? ` (${item.topModelProvider})`
                            : ''}
                        </div>
                        <div style={middleSub}>
                          Privacy: {item.privacy || '—'}
                        </div>
                      </div>
                      <div style={middleScoreBlock}>
                        <div style={middleScoreLabel}>Score</div>
                        <div style={middleScoreValue}>{score}</div>
                      </div>
                    </div>

                    <p style={summaryLine}>
                      <b>Pros:</b> —
                    </p>
                    <p style={summaryLine}>
                      <b>Cons:</b> —
                    </p>
                    <p style={summaryLine}>
                      <b>Cost &amp; Latency:</b> $
                      0 per 1M tokens (compute only); target{' '}
                      {item.latency ? `${item.latency} ms` : '—'}
                    </p>
                    <p style={summaryLine}>
                      <b>RAG tip:</b> —
                    </p>
                    <p style={summaryLine}>
                      <b>Sources:</b> —
                    </p>
                  </div>

                  {/* Evidence summary */}
                  <div style={evidenceBox}>
                    <div style={evidenceTitle}>Evidence summary</div>
                    <div style={evidenceSubtitle}>
                      Benchmarks, metadata, and popularity for this task.
                    </div>

                    <table style={evidenceTable}>
                      <thead>
                        <tr>
                          <th>Model</th>
                          <th>TaskFit</th>
                          <th>Cost $/1M</th>
                          <th>Latency</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td>{item.topModelName ?? '—'}</td>
                          <td>—</td>
                          <td>—</td>
                          <td>
                            {item.latency ? `${item.latency} ms` : '—'}
                          </td>
                        </tr>
                        <tr>
                          <td>—</td>
                          <td>—</td>
                          <td>—</td>
                          <td>—</td>
                        </tr>
                        <tr>
                          <td>—</td>
                          <td>—</td>
                          <td>—</td>
                          <td>—</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* RIGHT COLUMN – Compare / Actions / Notes / Context limits */}
                <div style={rightCol}>
                  <div style={rightSection}>
                    <div style={sectionTitle}>Compare</div>
                    <ul style={compareList}>
                      <li>
                        <label>
                          <input type="checkbox" defaultChecked />{' '}
                          {item.topModelName ?? 'Top model'} — score {score}
                        </label>
                      </li>
                      <li>
                        <label>
                          <input type="checkbox" /> (slot 2) — score —
                        </label>
                      </li>
                      <li>
                        <label>
                          <input type="checkbox" /> (slot 3) — score —
                        </label>
                      </li>
                    </ul>
                  </div>

                  <div style={rightSection}>
                    <div style={sectionTitle}>Actions</div>
                    <div style={{ display: 'grid', gap: 6 }}>
                      <button
                        type="button"
                        style={smallActionButton}
                        onClick={() => removeCard(item.id)}
                      >
                        Remove from dashboard
                      </button>
                      <button
                        type="button"
                        style={smallActionButton}
                        onClick={exportPdfPlaceholder}
                      >
                        Export PDF
                      </button>
                      <button
                        type="button"
                        style={smallActionButton}
                        onClick={() => copyRationale(item)}
                      >
                        Copy rationale
                      </button>
                    </div>
                  </div>

                  <div style={rightSection}>
                    <div style={sectionTitle}>Notes</div>
                    <textarea
                      style={notesArea}
                      placeholder="Add a comment for audit trail…"
                      value={noteVal}
                      onChange={(e) =>
                        handleNoteChange(item.id, e.target.value)
                      }
                      onBlur={() => void persistNote(item.id)}
                    />
                  </div>

                  <div style={rightSection}>
                    <div style={sectionTitle}>Context limits</div>
                    <ul style={compareList}>
                      <li>
                        Top model: {item.context.toLocaleString()} tokens
                      </li>
                      <li>Slot 2: —</li>
                      <li>Slot 3: —</li>
                    </ul>
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

/* ---------- styles ---------- */

const pageStyle: CSSProperties = {
  ...pageShell,
  justifyContent: 'center',
  alignItems: 'flex-start',
  padding: '24px 16px',
}

const cardStyle: CSSProperties = {
  ...card,
  width: '100%',
  maxWidth: 1200,
  maxHeight: 'none',
  overflow: 'visible',
}

const secondaryRefreshButton: CSSProperties = {
  padding: '6px 14px',
  borderRadius: 999,
  border: `1px solid ${colors.borderSubtle}`,
  background: colors.white,
  cursor: 'pointer',
  marginBottom: 12,
  fontSize: 13,
  color: colors.textMain,
}

const errorBox: CSSProperties = {
  color: colors.danger,
  background: colors.dangerSoft,
  border: `1px solid ${colors.dangerBorder}`,
  padding: 10,
  borderRadius: 8,
  marginBottom: 10,
  fontSize: 13,
}

/* Dashboard card layout */

const dashboardCard: CSSProperties = {
  padding: 16,
  borderRadius: 16,
  border: `1px solid ${colors.borderSubtle}`,
  background: colors.white,
  display: 'grid',
  gridTemplateColumns: '260px minmax(0, 1fr) 260px',
  gap: 16,
}

const smallMeta: CSSProperties = {
  fontSize: 11,
  color: colors.textMuted,
  marginBottom: 8,
}

const leftCol: CSSProperties = {
  borderRight: `1px solid ${colors.borderSubtle}`,
  paddingRight: 12,
}

const middleCol: CSSProperties = {
  paddingRight: 12,
  borderRight: `1px solid ${colors.borderSubtle}`,
}

const rightCol: CSSProperties = {
  display: 'grid',
  gap: 10,
}

const sectionTitle: CSSProperties = {
  fontSize: 13,
  fontWeight: 700,
  margin: '6px 0 2px',
  color: colors.textMain,
}

const sectionBody: CSSProperties = {
  margin: 0,
  fontSize: 13,
  color: colors.textMain,
  lineHeight: 1.4,
}

const middleHeader: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  gap: 8,
  marginBottom: 4,
}

const middleTitle: CSSProperties = {
  fontSize: 14,
  fontWeight: 700,
  color: colors.textMain,
}

const middleSub: CSSProperties = {
  fontSize: 12,
  color: colors.textMuted,
}

const middleScoreBlock: CSSProperties = {
  textAlign: 'right',
}

const middleScoreLabel: CSSProperties = {
  fontSize: 11,
  color: colors.textMuted,
}

const middleScoreValue: CSSProperties = {
  fontSize: 16,
  fontWeight: 700,
  color: colors.textMain,
}

const summaryLine: CSSProperties = {
  margin: '2px 0',
  fontSize: 12,
  color: colors.textMain,
}

/* Evidence summary */

const evidenceBox: CSSProperties = {
  marginTop: 10,
  padding: 10,
  borderRadius: 10,
  border: `1px solid ${colors.borderSubtle}`,
  background: '#f9fafb',
}

const evidenceTitle: CSSProperties = {
  fontSize: 13,
  fontWeight: 700,
  marginBottom: 2,
}

const evidenceSubtitle: CSSProperties = {
  fontSize: 11,
  color: colors.textMuted,
  marginBottom: 6,
}

const evidenceTable: CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  fontSize: 11,
}

const rightSection: CSSProperties = {
  fontSize: 12,
}

const compareList: CSSProperties = {
  listStyle: 'none',
  paddingLeft: 0,
  margin: '4px 0 0',
  fontSize: 12,
  color: colors.textMain,
}

const smallActionButton: CSSProperties = {
  ...primaryButton,
  fontSize: 12,
  padding: '4px 8px',
  borderRadius: 999,
  justifyContent: 'center',
}

const notesArea: CSSProperties = {
  width: '100%',
  minHeight: 70,
  resize: 'vertical',
  fontSize: 12,
  padding: 6,
  borderRadius: 8,
  border: `1px solid ${colors.borderSubtle}`,
  fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
}
