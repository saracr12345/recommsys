import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react'

const styles: Record<string, CSSProperties> = {
  page: {
    fontFamily:
      'system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif',
    padding: 16,
    paddingTop: 0,
    color: '#0f172a',
    background: '#f8fafc',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  grid: { display: 'grid', gridTemplateColumns: '300px 1fr', gap: 16 },

  // sticky + scrollable left column
  sidebarWrapper: {
    position: 'sticky',
    top: 120,
    maxHeight: 'calc(100vh - 130px)', // room for top text
    overflowY: 'auto',
    paddingRight: 4, // avoid scrollbar over content
  },

  sidebar: { display: 'grid', gap: 12, alignContent: 'start' },

  card: {
    background: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: 14,
    padding: 14,
    boxShadow: '0 8px 24px rgba(15,23,42,0.06)',
  },
  cardTitle: {
    margin: 0,
    marginBottom: 8,
    fontSize: 14,
    fontWeight: 700,
    color: '#0f172a',
  },
  label: {
    display: 'block',
    fontSize: 12,
    color: '#334155',
    marginBottom: 6,
  },
  input: {
    width: '100%',
    padding: '8px 10px',
    border: '1px solid #cbd5e1',
    borderRadius: 8,
    outline: 'none',
    boxSizing: 'border-box',
  },
  button: {
    padding: '8px 12px',
    borderRadius: 8,
    border: '1px solid #cbd5e1',
    background: '#f8fafc',
    cursor: 'pointer',
  },
  buttonPrimary: {
    padding: '8px 12px',
    borderRadius: 8,
    border: '1px solid #1d4ed8',
    background: '#1d4ed8',
    color: 'white',
    cursor: 'pointer',
  },
  textButton: {
    padding: 0,
    border: 'none',
    background: 'transparent',
    color: '#1d4ed8',
    cursor: 'pointer',
  },
  pill: {
    fontSize: 12,
    padding: '6px 8px',
    background: '#f1f5f9',
    border: '1px solid #e2e8f0',
    borderRadius: 999,
    cursor: 'pointer',
  },
  feedGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
  info: {
    background: '#eff6ff',
    border: '1px solid #bfdbfe',
    color: '#1e40af',
    padding: 10,
    borderRadius: 8,
  },
  error: {
    background: '#fef2f2',
    border: '1px solid #fecaca',
    color: '#b91c1c',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
}

const STORAGE_KEYS = {
  KEYWORDS: 'llmtech.keywords.v1',
  READ: 'llmtech.read.v1',
  FAV: 'llmtech.fav.v1',
  PREFS: 'llmtech.prefs.v1',
}

const defaultKeywords = [
  'RAG',
  'distillation',
  'quantization',
  'agent',
  'reasoning',
  'multimodal',
  'benchmark',
  'inference',
  'training',
  'speculative decoding',
  'LoRA',
  'QLoRA',
  'tool use',
  'memory',
  'long context',
  'mixture of experts',
  'safety',
  'alignment',
]

function saveLocal(key: string, val: any) {
  try {
    localStorage.setItem(key, JSON.stringify(val))
  } catch {}
}

function loadLocal<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key)
    return v ? (JSON.parse(v) as T) : fallback
  } catch {
    return fallback
  }
}

function timeSince(dateStr?: string) {
  const d = new Date(dateStr || '')
  if (Number.isNaN(d.getTime())) return ''
  const diff = (Date.now() - d.getTime()) / 1000
  if (diff < 60) return `${Math.floor(diff)}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`
  return d.toLocaleDateString()
}

function useDebounced<T>(value: T, delay = 300) {
  const [v, setV] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return v
}

export default function TrackerPage() {
  // Feeds now come from backend '/feeds'
  const [keywords, setKeywords] = useState(() =>
    loadLocal(STORAGE_KEYS.KEYWORDS, defaultKeywords),
  )
  const [readIds, setReadIds] = useState<Record<string, boolean>>(() =>
    loadLocal(STORAGE_KEYS.READ, {}),
  )
  const [favIds, setFavIds] = useState<Record<string, boolean>>(() =>
    loadLocal(STORAGE_KEYS.FAV, {}),
  )
  const [prefs, setPrefs] = useState(() =>
    loadLocal(STORAGE_KEYS.PREFS, {
      tab: 'all',
      sort: 'newest',
      onlyKeywordMatches: true,
      showSummaries: true,
      onlyFavorites: false,
    }),
  )

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [entries, setEntries] = useState<any[]>([])
  const [q, setQ] = useState('')
  const qDebounced = useDebounced(q, 250)
  const [newKeyword, setNewKeyword] = useState('')
  const [activeKws, setActiveKws] = useState<string[]>([])
  const [financeTrends, setFinanceTrends] = useState<
    Array<{ term: string; change: number; now: number; prev: number }>
  >([])
  const lastRefreshedRef = useRef<Date | null>(null)

  useEffect(() => saveLocal(STORAGE_KEYS.KEYWORDS, keywords), [keywords])
  useEffect(() => saveLocal(STORAGE_KEYS.READ, readIds), [readIds])
  useEffect(() => saveLocal(STORAGE_KEYS.FAV, favIds), [favIds])
  useEffect(() => saveLocal(STORAGE_KEYS.PREFS, prefs), [prefs])

  async function refreshFeeds() {
    setLoading(true)
    setError('')
    try {
      const r = await fetch('http://localhost:8787/feeds', { cache: 'no-store' })
      if (!r.ok) throw new Error('feeds failed')
      const items = await r.json()

      // items are already deduped/sorted by the backend, but keep client sorting toggle
      const sorted = [...items].sort((a, b) => {
        const da = new Date(a.date).getTime() || 0
        const db = new Date(b.date).getTime() || 0
        return prefs.sort === 'oldest' ? da - db : db - da
      })
      setEntries(sorted)
      lastRefreshedRef.current = new Date()
    } catch (e) {
      setError('Failed to fetch feeds (server). Try again later.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refreshFeeds()
  }, []) // initial load

  // Finance trend detection...
  useEffect(() => {
    if (!entries.length) {
      setFinanceTrends([])
      return
    }
    const financeTerms = [
      'finance',
      'financial',
      'stocks',
      'market',
      'portfolio',
      'trading',
      'sentiment',
      'earnings',
      'bank',
      'macro',
      'inflation',
      'risk',
      'credit',
      'bond',
    ]
    const now = Date.now()
    const day = 24 * 3600 * 1000
    const w1 = now - 7 * day
    const w2 = now - 14 * day

    const score = (start: number, end: number) => {
      const counts: Record<string, number> = {}
      for (const it of entries) {
        const t = new Date(it.date || '').getTime()
        if (!t || t < end || t >= start) continue
        const text = `${it.title} ${it.summary}`.toLowerCase()
        for (const term of financeTerms) {
          if (text.includes(term))
            counts[term] = (counts[term] || 0) + 1
        }
      }
      return counts
    }

    const prev = score(w2, w1)
    const cur = score(now, w1)
    const merged = Array.from(
      new Set([...Object.keys(prev), ...Object.keys(cur)]),
    ).map((term) => ({
      term,
      prev: prev[term] || 0,
      now: cur[term] || 0,
      change: (cur[term] || 0) - (prev[term] || 0),
    }))
    merged.sort((a, b) => b.change - a.change || b.now - a.now)
    setFinanceTrends(merged.slice(0, 8))
  }, [entries])

  const filtered = useMemo(() => {
    const ql = (qDebounced || '').trim().toLowerCase()
    const baseKw = (activeKws.length ? activeKws : (keywords as string[])).map(
      (k) => k.toLowerCase(),
    )
    const kwSet = new Set(baseKw)

    let arr = entries.filter((e) => {
      if (prefs.onlyFavorites && !favIds[e.id]) return false
      if (prefs.tab !== 'all' && e.type !== prefs.tab) return false
      const t = `${e.title} ${e.summary} ${e.author} ${e.source}`.toLowerCase()
      if (ql && !t.includes(ql)) return false
      if (prefs.onlyKeywordMatches) {
        const hasKw = [...kwSet].some((k) => t.includes(k))
        if (!hasKw) return false
      }
      return true
    })

    if (prefs.sort === 'relevance') {
      const weights = new Map<string, number>(baseKw.map((k) => [k, 1]))
      arr = arr
        .map((e) => {
          const t = `${e.title} ${e.summary}`.toLowerCase()
          let score = 0
          weights.forEach((w, k) => {
            let idx = 0
            while (true) {
              idx = t.indexOf(k, idx)
              if (idx === -1) break
              score += w
              idx += k.length
            }
          })
          if (ql) {
            let iq = 0
            let pos = 0
            while (true) {
              pos = t.indexOf(ql, pos)
              if (pos === -1) break
              iq += 0.5
              pos += ql.length
            }
            score += iq
          }
          return { e, score }
        })
        .sort((a, b) => b.score - a.score)
        .map((x) => x.e)
    }

    return arr
  }, [
    entries,
    favIds,
    prefs.tab,
    prefs.onlyFavorites,
    qDebounced,
    prefs.onlyKeywordMatches,
    prefs.sort,
    keywords,
    activeKws,
  ])

  function toggleRead(id: string) {
    setReadIds((prev) => ({ ...prev, [id]: !prev[id] }))
  }
  function toggleFav(id: string) {
    setFavIds((prev) => ({ ...prev, [id]: !prev[id] }))
  }
  function addKeyword(k: string) {
    const key = (k || '').trim()
    if (!key) return
    if (!(keywords as string[]).includes(key))
      setKeywords([...(keywords as string[]), key])
    setNewKeyword('')
  }
  function removeKeyword(k: string) {
    setKeywords((keywords as string[]).filter((x) => x !== k))
  }
  function toggleActiveKw(k: string) {
    setActiveKws((prev) =>
      prev.includes(k) ? prev.filter((x) => x !== k) : [...prev, k],
    )
  }
  function clearActiveKws() {
    setActiveKws([])
  }

  const lastRefreshedStr = lastRefreshedRef.current
    ? lastRefreshedRef.current.toLocaleString()
    : ''

  return (
    <div style={styles.page}>
      <header
        style={{
          ...styles.header,
          position: 'sticky',
          top: 0,
          zIndex: 5,
          background: '#f8fafc',
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: 22 }}>
            Track And Explore Cutting-Edge LLM Research
          </h1>
          <p style={{ color: '#475569', marginTop: 6 }}>
            Stay informed on the latest breakthroughs in AI and LLMs, tailored
            to your keywords and interests. Need task-specific guidance? Our AI
            chat provides personalized LLM suggestions to support you.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={refreshFeeds}
            disabled={loading}
            style={styles.buttonPrimary}
          >
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
          <span style={{ fontSize: 12, color: '#64748b' }}>
            {lastRefreshedStr && `Last updated: ${lastRefreshedStr}`}
          </span>
        </div>
      </header>

      <div style={styles.grid}>
        {/* LEFT – filters/keywords/sources */}
        <aside
          style={{
            ...styles.sidebarWrapper,
          }}
        >
          <div style={styles.sidebar}>
            {/* Filters */}
            <section style={styles.card}>
              <h3 style={styles.cardTitle}>Filters</h3>
              <div style={{ display: 'grid', gap: 8 }}>
                <div>
                  <label style={styles.label}>Type</label>
                  <select
                    value={prefs.tab}
                    onChange={(e) =>
                      setPrefs((p: any) => ({
                        ...p,
                        tab: (e.target as HTMLSelectElement).value,
                      }))
                    }
                    style={styles.input}
                  >
                    <option value="all">All</option>
                    <option value="paper">Papers</option>
                    <option value="blog">Blogs</option>
                  </select>
                </div>
                <div>
                  <label style={styles.label}>Search</label>
                  <input
                    placeholder="Search titles & summaries…"
                    value={q}
                    onChange={(e) =>
                      setQ((e.target as HTMLInputElement).value)
                    }
                    style={styles.input}
                  />
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      fontSize: 14,
                      color: '#0f172a',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={!!prefs.onlyKeywordMatches}
                      onChange={(e) =>
                        setPrefs((p: any) => ({
                          ...p,
                          onlyKeywordMatches: (
                            e.target as HTMLInputElement
                          ).checked,
                        }))
                      }
                    />
                    <span> Keywords only</span>
                  </label>
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      fontSize: 14,
                      color: '#0f172a',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={!!prefs.showSummaries}
                      onChange={(e) =>
                        setPrefs((p: any) => ({
                          ...p,
                          showSummaries: (
                            e.target as HTMLInputElement
                          ).checked,
                        }))
                      }
                    />
                    <span> Show summaries</span>
                  </label>
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      fontSize: 14,
                      color: '#0f172a',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={!!prefs.onlyFavorites}
                      onChange={(e) =>
                        setPrefs((p: any) => ({
                          ...p,
                          onlyFavorites: (
                            e.target as HTMLInputElement
                          ).checked,
                        }))
                      }
                    />
                    <span> Favorites</span>
                  </label>
                </div>
                <div>
                  <label style={styles.label}>Sort</label>
                  <select
                    value={prefs.sort}
                    onChange={(e) =>
                      setPrefs((p: any) => ({
                        ...p,
                        sort: (e.target as HTMLSelectElement).value,
                      }))
                    }
                    style={styles.input}
                  >
                    <option value="newest">Newest</option>
                    <option value="oldest">Oldest</option>
                    <option value="relevance">Relevance</option>
                  </select>
                </div>
              </div>
            </section>

            {/* Tracked keywords */}
            <section style={styles.card}>
              <h3 style={styles.cardTitle}>Tracked keywords</h3>
              <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <input
                  placeholder="Add a keyword…"
                  value={newKeyword}
                  onChange={(e) =>
                    setNewKeyword((e.target as HTMLInputElement).value)
                  }
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') addKeyword(newKeyword)
                  }}
                  style={styles.input}
                />
                <button
                  onClick={() => addKeyword(newKeyword)}
                  style={styles.button}
                >
                  Add
                </button>
                {!!activeKws.length && (
                  <button onClick={clearActiveKws} style={styles.button}>
                    Clear selection
                  </button>
                )}
              </div>
              <div
                style={{
                  display: 'flex',
                  gap: 6,
                  flexWrap: 'wrap',
                  maxHeight: 220,
                  overflowY: 'auto',
                  paddingRight: 4,
                }}
              >
                {(keywords as string[]).map((k) => {
                  const selected = activeKws.includes(k)
                  return (
                    <span
                      key={k}
                      style={{
                        ...styles.pill,
                        background: selected ? '#e0e7ff' : '#f1f5f9',
                        borderColor: selected ? '#93c5fd' : '#e2e8f0',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      <button
                        onClick={() => toggleActiveKw(k)}
                        style={{
                          border: 'none',
                          background: 'transparent',
                          cursor: 'pointer',
                          color: '#0f172a',
                        }}
                      >
                        {k}
                      </button>
                      <button
                        onClick={(ev) => {
                          ev.stopPropagation()
                          removeKeyword(k)
                        }}
                        title="Remove"
                        style={{
                          border: 'none',
                          background: 'transparent',
                          cursor: 'pointer',
                          color: '#64748b',
                        }}
                      >
                        ×
                      </button>
                    </span>
                  )
                })}
              </div>
            </section>

            {/* Sources */}
            <section style={styles.card}>
              <h3 style={styles.cardTitle}>Sources</h3>
              <div style={styles.info}>
                Sources are now <b>managed on the server</b>. The list here is
                informational only. If you want a UI to manage server-side
                sources later, we can add an admin screen.
              </div>
            </section>
          </div>
        </aside>

        {/* RIGHT - feed + finance trends */}
        <main>
          {error && <div style={styles.error}>{error}</div>}
          {loading ? (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 12,
              }}
            >
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  style={{
                    ...styles.card,
                    height: 180,
                    background:
                      'linear-gradient(90deg,#f3f4f6 20%, #e5e7eb 40%, #f3f4f6 60%)',
                    backgroundSize: '200% 100%',
                    animation: 'shimmer 1.2s infinite',
                  }}
                />
              ))}
            </div>
          ) : (
            <FeedList
              items={filtered}
              readIds={readIds}
              favIds={favIds}
              toggleRead={toggleRead}
              toggleFav={toggleFav}
              keywords={keywords as string[]}
              showSummaries={!!prefs.showSummaries}
            />
          )}

          {!!financeTrends.length && (
            <div style={{ marginTop: 16 }}>
              <div style={styles.card}>
                <h3
                  style={{
                    ...styles.cardTitle,
                    marginBottom: 12,
                  }}
                >
                  Finance trends (7d vs prior 7d)
                </h3>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns:
                      'repeat(auto-fit,minmax(160px,1fr))',
                    gap: 8,
                  }}
                >
                  {financeTrends.map((t) => (
                    <div
                      key={t.term}
                      style={{
                        border: '1px solid #e5e7eb',
                        borderRadius: 10,
                        padding: 8,
                        background: '#fff',
                      }}
                    >
                      <div
                        style={{
                          fontWeight: 600,
                          textTransform: 'capitalize',
                        }}
                      >
                        {t.term}
                      </div>
                      <div
                        style={{
                          fontSize: 12,
                          color: '#64748b',
                        }}
                      >
                        Now {t.now} • Prev {t.prev}
                      </div>
                      <div
                        style={{
                          marginTop: 4,
                          fontSize: 12,
                          color:
                            t.change >= 0 ? '#16a34a' : '#b91c1c',
                        }}
                      >
                        {t.change >= 0 ? '+' : ''}
                        {t.change}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

function stripHtml(html: string) {
  const div = document.createElement('div')
  div.innerHTML = html
  return (div.textContent || div.innerText || '').trim()
}

function highlightKeywords(text: string, kwsLower: string[]) {
  if (!text) return null
  const lower = text.toLowerCase()
  const ranges: Array<[number, number]> = []
  kwsLower.forEach((k) => {
    if (!k) return
    let idx = 0
    while (true) {
      idx = lower.indexOf(k, idx)
      if (idx === -1) break
      ranges.push([idx, idx + k.length])
      idx += k.length
    }
  })
  if (!ranges.length) return text
  ranges.sort((a, b) => a[0] - b[0])
  const merged: Array<[number, number]> = []
  for (const [s, e] of ranges) {
    if (!merged.length || s > merged[merged.length - 1][1]) {
      merged.push([s, e])
    } else {
      merged[merged.length - 1][1] = Math.max(
        merged[merged.length - 1][1],
        e,
      )
    }
  }
  const parts: any[] = []
  let prev = 0
  merged.forEach(([s, e], i) => {
    if (s > prev) parts.push(text.slice(prev, s))
    parts.push(
      <mark
        key={i}
        style={{
          background: '#fde68a',
          borderRadius: 4,
          padding: '0 2px',
        }}
      >
        {text.slice(s, e)}
      </mark>,
    )
    prev = e
  })
  if (prev < text.length) parts.push(text.slice(prev))
  return <>{parts}</>
}

function FeedList({
  items,
  readIds,
  favIds,
  toggleRead,
  toggleFav,
  keywords,
  showSummaries,
}: any) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [cols, setCols] = useState(2)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(() => {
      const w = el.clientWidth
      setCols(w < 780 ? 1 : 2)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const kwLower = useMemo(
    () => (keywords as string[]).map((k) => k.toLowerCase()),
    [keywords],
  )

  if (!items || !items.length) {
    return (
      <div style={styles.card}>
        <div style={{ color: '#475569' }}>
          No items yet. Try Refresh.
        </div>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      style={{
        ...styles.feedGrid,
        gridTemplateColumns: cols === 1 ? '1fr' : '1fr 1fr',
      }}
    >
      {items.map((e: any) => (
        <div
          key={e.id}
          style={{
            ...styles.card,
            opacity: readIds[e.id] ? 0.85 : 1,
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: 8,
            }}
          >
            <div
              style={{
                fontWeight: 600,
                color: readIds[e.id] ? '#1d4ed8' : '#0f172a',
              }}
            >
              {highlightKeywords(e.title, kwLower)}
            </div>
            <div
              style={{
                display: 'flex',
                gap: 8,
                alignItems: 'center',
              }}
            >
              <button
                onClick={() => toggleRead(e.id)}
                style={styles.textButton}
              >
                {readIds[e.id] ? 'Unread' : 'Read'}
              </button>
              <a
                href={e.link}
                target="_blank"
                rel="noreferrer"
                style={styles.textButton}
              >
                Open
              </a>
              <button
                title="Favorite"
                onClick={() => toggleFav(e.id)}
                style={styles.textButton}
              >
                {favIds[e.id] ? '★' : '☆'}
              </button>
            </div>
          </div>
          <div
            style={{
              marginTop: 4,
              fontSize: 12,
              color: '#64748b',
            }}
          >
            <span>{e.source}</span>
            <span> • </span>
            <span>{timeSince(e.date)}</span>
            {e.author && (
              <>
                <span> • </span>
                <span title={e.author}>{e.author}</span>
              </>
            )}
          </div>
          {showSummaries && e.summary && (
            <div
              style={{
                marginTop: 8,
                color: '#0f172a',
              }}
            >
              {highlightKeywords(stripHtml(e.summary), kwLower)}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
