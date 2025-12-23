import { useEffect, useState, type CSSProperties } from 'react';
import { pageShell, card, input, primaryButton, colors } from '@/ui/styles';
import { api } from '@/lib/api';

// ---- types that match the backend /recommend response ----
type AdvisorModel = {
  name: string;
  provider: string;
  context: number;
  latencyMs: number;
  costPer1kTokens: number;
  tags: string[];
  cons?: string;
  pros?: string;
};

type AdvisorFactors = {
  privacyMatch: number;
  ctxScore: number;
  latencyScore: number;
  costScore: number;
  domainScore: number;
};

type AdvisorResult = {
  model: AdvisorModel;
  score: number;
  confidence?: number;
  factors?: AdvisorFactors;
  why?: string[];
  ragTip?: string;
  sources?: string[] | string;
  pros?: string;
  cons?: string;
};

type RecommendResponse = {
  ok: boolean;
  eventId: number;
  results: AdvisorResult[];
};

type SavedListResponse = {
  ok: boolean;
  items: { id: number }[];
};

export default function App() {
  const [task, setTask] = useState('financial sentiment');
  const [privacy, setPrivacy] = useState('Self-host');
  const [latency, setLatency] = useState(1200);
  const [ctx, setCtx] = useState(4000);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<AdvisorResult[]>([]);
  const [error, setError] = useState<string>('');

  // new: current recommendation event id + save state
  const [eventId, setEventId] = useState<number | null>(null);
  const [runSaved, setRunSaved] = useState(false);
  const [savedCount, setSavedCount] = useState(0);

  // load total saved dashboards count once
  useEffect(() => {
    (async () => {
      try {
        const data = await api<SavedListResponse>('/recommendations/saved', {
          method: 'GET',
        });
        if (data.ok) {
          setSavedCount(data.items?.length ?? 0);
        }
      } catch {
      }
    })();
  }, []);

  async function recommend() {
    setLoading(true);
    setError('');
    setResults([]);
    setEventId(null);
    setRunSaved(false);

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
      });

      if (!data.ok) {
        throw new Error('Recommendation failed');
      }

      setResults(data.results ?? []);
      setEventId(data.eventId ?? null);
      setRunSaved(false); // new run isn't saved yet
    } catch (e: any) {
      setError(e.message || 'Error');
    } finally {
      setLoading(false);
    }
  }

  async function toggleSaveCurrentRun() {
    if (!eventId) return;

    try {
      const data = await api<{ ok: boolean; saved: boolean; savedCount: number }>(
        '/recommendations/saved',
        {
          method: 'POST',
          body: JSON.stringify({ eventId }),
        },
      );

      if (!data.ok) throw new Error('Failed to toggle save');

      setRunSaved(data.saved);
      setSavedCount(data.savedCount);
    } catch (e) {
      console.error('failed to toggle save', e);
    }
  }

  function confidenceLabel(conf?: number): string {
    if (conf == null) return '';
    if (conf >= 0.75) return 'High';
    if (conf >= 0.5) return 'Medium';
    return 'Low';
  }

  function scorePercent(res: AdvisorResult): number | null {
    const f = res.factors;
    if (f) {
      const avg =
        (num(f.privacyMatch) +
          num(f.ctxScore) +
          num(f.latencyScore) +
          num(f.costScore) +
          num(f.domainScore)) /
        5;
      return clamp(Math.round(avg * 100), 0, 100);
    }
    if (res.confidence != null)
      return clamp(Math.round(res.confidence * 100), 0, 100);

    if (res.score <= 1.5) return clamp(Math.round(res.score * 100), 0, 100);
    return clamp(Math.round(res.score), 0, 100);
  }

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        <div style={{ marginBottom: 12, textAlign: 'center' }}>
          <h2 style={titleStyle}>LLM Advisor</h2>
          <p style={subtitleStyle}>
            Input your task → get the best model ranked for you.
          </p>
          <div style={{ marginTop: 6, fontSize: 12, color: colors.textMuted }}>
            Saved dashboards: {savedCount}
          </div>
        </div>

        {/* FORM FIELDS */}
        <div style={{ display: 'grid', gap: 12 }}>
          <div style={fieldStyle}>
            <div style={labelStyle}>Task</div>
            <input
              value={task}
              onChange={(e) => setTask(e.target.value)}
              placeholder="e.g. financial sentiment, classification, extraction"
              style={inputStyle}
            />
          </div>

          <div style={fieldStyle}>
            <div style={labelStyle}>Privacy</div>
            <select
              value={privacy}
              onChange={(e) => setPrivacy(e.target.value)}
              style={inputStyle}
            >
              <option>Self-host</option>
              <option>Cloud</option>
              <option>Any</option>
            </select>
          </div>

          <div style={fieldStyle}>
            <div style={labelStyle}>Latency target (ms)</div>
            <input
              type="number"
              value={latency}
              onChange={(e) => setLatency(parseInt(e.target.value || '0'))}
              style={inputStyle}
            />
          </div>

          <div style={fieldStyle}>
            <div style={labelStyle}>Context tokens needed</div>
            <input
              type="number"
              value={ctx}
              onChange={(e) => setCtx(parseInt(e.target.value || '0'))}
              style={inputStyle}
            />
          </div>
        </div>

        <button onClick={recommend} disabled={loading} style={buttonStyle}>
          {loading ? 'Thinking…' : 'Recommend'}
        </button>

        {error && <div style={errorStyle}>{error}</div>}

        <div style={{ marginTop: 16, display: 'grid', gap: 14 }}>
          {results.length === 0 && !loading && (
            <div style={helperTextStyle}>
              Run a recommendation to see ranked models here.
            </div>
          )}

          {results.map((res, i) => {
            const pct = scorePercent(res);
            const model = res.model ?? ({} as AdvisorModel);

            const pros = safe((res as any).pros ?? (model as any).pros ?? '');
            const cons = safe((res as any).cons ?? (model as any).cons ?? '');
            const ragTip = safe((res as any).ragTip ?? '');
            const sourcesRaw = (res as any).sources ?? '';
            const sources = safe(
              Array.isArray(sourcesRaw)
                ? sourcesRaw.join('; ')
                : String(sourcesRaw || ''),
            );

            const checks: string[] = [
              privacy === 'Any' ? '' : 'Matches privacy requirement',
              model.context != null &&
              ctx != null &&
              model.context >= ctx
                ? 'Satisfies context window'
                : '',
              model.latencyMs != null &&
              latency != null &&
              model.latencyMs <= latency
                ? 'Meets latency target'
                : '',
            ].filter(Boolean);

            const bullets = Array.from(
              new Set([...(res.why ?? []), ...checks]),
            ).filter(Boolean);

            const showSave = i === 0; // only show Save button on top model card

            return (
              <div key={i} style={wordCardStyle}>
                <div style={wordTopRow}>
                  <div style={{ display: 'grid', gap: 4 }}>
                    <div style={wordTitle}>
                      #{i + 1} — {safe(model.name)}
                    </div>

                    <div style={wordLine}>
                      <span style={labelStrong}>Provider:</span>{' '}
                      {safe(model.provider)}
                    </div>

                    <div style={wordLine}>
                      <span style={labelStrong}>Context:</span>{' '}
                      {model.context != null
                        ? model.context.toLocaleString()
                        : ''}{' '}
                      tokens
                    </div>

                    <div style={wordLine}>
                      <span style={labelStrong}>Latency:</span>{' '}
                      {model.latencyMs != null ? `${model.latencyMs} ms` : ''}
                    </div>
                  </div>

                  <div style={wordRightCol}>
                    {showSave && (
                      <button
                        onClick={() => void toggleSaveCurrentRun()}
                        title={runSaved ? 'Unsave' : 'Save'}
                        style={{
                          ...starButtonStyle,
                          color: runSaved
                            ? colors.emeraldDark
                            : colors.textMuted,
                        }}
                        disabled={!eventId}
                      >
                        {runSaved ? '★ Saved' : '☆ Save'}
                      </button>
                    )}

                    <div style={wordScore}>
                      <span style={{ opacity: 0.9 }}>Score:</span>{' '}
                      {pct == null ? '' : `${pct}%`}
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: 10 }}>
                  <div style={wordLineMuted}>
                    <span style={labelStrong}>Cost:</span>{' '}
                    {model.costPer1kTokens != null
                      ? `$${model.costPer1kTokens}/1k tokens`
                      : ''}
                  </div>
                </div>

                <div style={{ marginTop: 10 }}>
                  <div style={wordLineMuted}>
                    <span style={labelStrong}>Pros:</span> {pros}
                  </div>
                  <div style={{ height: 6 }} />
                  <div style={wordLineMuted}>
                    <span style={labelStrong}>Cons:</span> {cons}
                  </div>
                </div>

                <div style={{ marginTop: 12 }}>
                  <div style={wordLineMuted}>
                    <span style={labelStrong}>RAG tip:</span> {ragTip}
                  </div>
                  <div style={wordLineMuted}>
                    <span style={labelStrong}>Sources:</span> {sources}
                  </div>
                </div>

                <div style={{ marginTop: 12 }}>
                  <div style={wordLine}>
                    <span style={labelStrong}>Tags:</span>{' '}
                    {model.tags && model.tags.length
                      ? model.tags.join(', ')
                      : ''}
                  </div>
                </div>

                {bullets.length > 0 && (
                  <div style={{ marginTop: 10 }}>
                    <ul style={wordBullets}>
                      {bullets.map((t) => (
                        <li key={t}>{t}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ---------- helpers ---------- */

function safe(v: any): string {
  if (v == null) return '';
  const s = String(v);
  return s === 'undefined' || s === 'null' ? '' : s;
}

function num(v: any): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

/* ---------- styles ---------- */

const pageStyle: CSSProperties = { ...pageShell };

const cardStyle: CSSProperties = {
  ...card,
  width: 620,
};

const inputStyle: CSSProperties = { ...input };

const buttonStyle: CSSProperties = {
  ...primaryButton,
  marginTop: 12,
  width: 200,
  justifySelf: 'center',
};

const fieldStyle: CSSProperties = {
  display: 'grid',
  gap: 4,
};

const labelStyle: CSSProperties = {
  fontSize: 13,
  color: colors.textMuted,
};

const errorStyle: CSSProperties = {
  color: colors.danger,
  background: colors.dangerSoft,
  border: `1px solid ${colors.dangerBorder}`,
  padding: 10,
  borderRadius: 8,
  marginTop: 10,
  textAlign: 'center',
  fontSize: 13,
};

const helperTextStyle: CSSProperties = {
  textAlign: 'center',
  opacity: 0.8,
  fontSize: 13,
  color: colors.textMuted,
};

const titleStyle: CSSProperties = {
  margin: 0,
  fontSize: 22,
  fontWeight: 700,
  color: colors.textMain,
};

const subtitleStyle: CSSProperties = {
  marginTop: 6,
  marginBottom: 0,
  fontSize: 14,
  color: colors.textMuted,
};

const wordCardStyle: CSSProperties = {
  padding: 18,
  borderRadius: 16,
  background: colors.white,
  border: `1px solid ${colors.borderSubtle}`,
  boxShadow: '0 6px 18px rgba(0,0,0,0.06)',
};

const wordTopRow: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  gap: 16,
};

const wordTitle: CSSProperties = {
  fontSize: 20,
  fontWeight: 800,
  color: colors.textMain,
  lineHeight: 1.15,
};

const wordLine: CSSProperties = {
  fontSize: 14,
  color: colors.textMain,
  lineHeight: 1.5,
};

const wordLineMuted: CSSProperties = {
  fontSize: 14,
  color: colors.textMuted,
  lineHeight: 1.55,
};

const labelStrong: CSSProperties = {
  fontWeight: 700,
  color: colors.textMain,
};

const wordRightCol: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-end',
  gap: 8,
  minWidth: 170,
};

const wordScore: CSSProperties = {
  fontSize: 16,
  color: colors.textMain,
  fontWeight: 600,
  whiteSpace: 'nowrap',
};

const wordBullets: CSSProperties = {
  margin: 0,
  paddingLeft: 18,
  fontSize: 13,
  color: colors.textMuted,
  lineHeight: 1.6,
};

const starButtonStyle: CSSProperties = {
  border: `1px solid ${colors.borderSubtle}`,
  background: 'transparent',
  borderRadius: 999,
  padding: '6px 10px',
  cursor: 'pointer',
  fontSize: 12,
  fontWeight: 600,
};
