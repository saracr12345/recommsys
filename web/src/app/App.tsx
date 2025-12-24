// web/src/pages/Recommend/App.tsx
import { useEffect, useState, type CSSProperties } from 'react';
import { pageShell, card, input, primaryButton, colors } from '@/ui/styles';
import { api } from '@/lib/api';

const MAX_SCORE = 1; // backend score is now 0..1

type AdvisorModel = {
  name: string;
  provider: string;
  context: number;
  latencyMs: number | null;
  costPer1kTokens: number | null;
  tags: string[];
  apiType?: string | null;
  modality?: string | null;
  pros?: string[];
  cons?: string[];
  ragTip?: string;
  sources?: string[];
};

type AdvisorFactors = {
  ctxScore: number;
  latencyScore: number;
  costScore: number;
  domainScore: number;
  unknownPenalty: number;
};

type AdvisorResult = {
  model: AdvisorModel;
  score: number; // 0..1
  confidence?: number;
  factors?: AdvisorFactors;
  why?: string[];
  warnings?: string[];
};

type PipelineStep = {
  role: string;
  model: AdvisorModel;
  rationale: string[];
  suggestedConfig: {
    temperature: number;
    maxOutputTokens: number;
    structuredOutput: boolean;
    citationsRequired: boolean;
  };
  promptHint: string;
};

type RecommendedPipeline = {
  label: string;
  steps: PipelineStep[];
  notes: string[];
};

type RecommendResponse = {
  ok: boolean;
  eventId: number | null;
  results: {
    singleModels: AdvisorResult[];
    recommendedPipeline?: RecommendedPipeline | null;
  };
  message?: string;
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

  // new state (replaces "results")
  const [singleModels, setSingleModels] = useState<AdvisorResult[]>([]);
  const [pipeline, setPipeline] = useState<RecommendedPipeline | null>(null);

  const [error, setError] = useState<string>('');
  const [message, setMessage] = useState<string>('');

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
        // ignore
      }
    })();
  }, []);

  async function recommend() {
    setLoading(true);
    setError('');
    setMessage('');

    // ✅ clear correct state
    setSingleModels([]);
    setPipeline(null);

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

      setSingleModels(data.results?.singleModels ?? []);
      setPipeline(data.results?.recommendedPipeline ?? null);

      setEventId(data.eventId ?? null);
      setMessage(data.message ?? '');
    } catch (e: any) {
      setError(e.message || 'Error');
    } finally {
      setLoading(false);
    }
  }

  async function toggleSaveCurrentRun() {
    if (!eventId) return;

    try {
      const data = await api<{
        ok: boolean;
        saved: boolean;
        savedCount: number;
      }>('/recommendations/saved', {
        method: 'POST',
        body: JSON.stringify({ eventId }),
      });

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

  // map backend score (0–1) -> percentage (0–100)
  function scorePercent(res: AdvisorResult): number | null {
    if (res.score == null) return null;
    return clamp(Math.round((res.score / MAX_SCORE) * 100), 0, 100);
  }

  function prettyApiType(apiType?: string | null): string {
    if (!apiType) return '';
    const v = apiType.toLowerCase();
    if (v === 'saas') return 'Cloud (SaaS)';
    if (v === 'self-hosted') return 'Self-hosted';
    if (v === 'open-source') return 'Open-source / self-host';
    return apiType;
  }

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        <div style={{ marginBottom: 12, textAlign: 'center' }}>
          <h2 style={titleStyle}>LLM Advisor</h2>
          <p style={subtitleStyle}>Input your task → get the best model ranked for you.</p>
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
        {message && !error && <div style={helperTextStyle}>{message}</div>}

        <div style={{ marginTop: 16, display: 'grid', gap: 14 }}>
          {/* ✅ Pipeline card */}
          {pipeline && (
            <div style={wordCardStyle}>
              <div style={wordTitle}>{safe(pipeline.label)}</div>

              {pipeline.steps?.map((s) => (
                <div key={s.role} style={{ marginTop: 12 }}>
                  <div style={wordLine}>
                    <span style={labelStrong}>{safe(s.role)}:</span>{' '}
                    {safe(s.model.name)} ({safe(s.model.provider)})
                  </div>

                  <div style={wordLineMuted}>
                    <span style={labelStrong}>Hosting:</span> {prettyApiType(s.model.apiType)}
                  </div>

                  <div style={{ marginTop: 6 }}>
                    <ul style={wordBullets}>
                      {(s.rationale ?? []).map((r) => (
                        <li key={r}>{r}</li>
                      ))}
                    </ul>
                  </div>

                  <div style={wordLineMuted}>
                    <span style={labelStrong}>Config:</span>{' '}
                    temp={s.suggestedConfig.temperature}, maxOut={s.suggestedConfig.maxOutputTokens},{' '}
                    structured={String(s.suggestedConfig.structuredOutput)}, citations=
                    {String(s.suggestedConfig.citationsRequired)}
                  </div>

                  <div style={wordLineMuted}>
                    <span style={labelStrong}>Prompt hint:</span> {safe(s.promptHint)}
                  </div>
                </div>
              ))}

              {(pipeline.notes ?? []).length > 0 && (
                <div style={{ marginTop: 12 }}>
                  <div style={wordLineMuted}>
                    <span style={labelStrong}>Notes:</span>
                  </div>
                  <ul style={wordBullets}>
                    {pipeline.notes.map((n) => (
                      <li key={n}>{n}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Empty state */}
          {singleModels.length === 0 && !loading && !message && (
            <div style={helperTextStyle}>Run a recommendation to see ranked models here.</div>
          )}

          {/* ✅ use singleModels (not results) */}
          {singleModels.slice(0, 10).map((res, i) => {
            const pct = scorePercent(res);
            const model = res.model ?? ({} as AdvisorModel);

            const sources = (model.sources ?? []).join('; ');
            const pros = model.pros ?? [];
            const cons = model.cons ?? [];
            const warnings = res.warnings ?? [];

            return (
              <div key={i} style={wordCardStyle}>
                <div style={wordTopRow}>
                  <div style={{ display: 'grid', gap: 4 }}>
                    <div style={wordTitle}>
                      #{i + 1} — {safe(model.name)}
                    </div>

                    <div style={wordLine}>
                      <span style={labelStrong}>Provider:</span> {safe(model.provider)}
                    </div>

                    <div style={wordLine}>
                      <span style={labelStrong}>Privacy / hosting:</span>{' '}
                      {prettyApiType(model.apiType)}
                    </div>

                    <div style={wordLine}>
                      <span style={labelStrong}>Context:</span>{' '}
                      {model.context != null ? model.context.toLocaleString() : ''} tokens
                    </div>

                    <div style={wordLine}>
                      <span style={labelStrong}>Latency:</span>{' '}
                      {model.latencyMs == null ? 'Unknown' : `${model.latencyMs} ms`}
                    </div>

                    <div style={wordLineMuted}>
                      <span style={labelStrong}>Confidence:</span>{' '}
                      {confidenceLabel(res.confidence)}
                    </div>
                  </div>

                  <div style={wordRightCol}>
                    <button
                      onClick={() => void toggleSaveCurrentRun()}
                      title={runSaved ? 'Unsave' : 'Save'}
                      style={{
                        ...starButtonStyle,
                        color: runSaved ? colors.emeraldDark : colors.textMuted,
                      }}
                      disabled={!eventId}
                    >
                      {runSaved ? '★ Saved' : '☆ Save'}
                    </button>

                    <div style={wordScore}>
                      <span style={{ opacity: 0.9 }}>Score:</span>{' '}
                      {pct == null ? '' : `${pct}%`}
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: 10 }}>
                  <div style={wordLineMuted}>
                    <span style={labelStrong}>Cost:</span>{' '}
                    {model.costPer1kTokens == null
                      ? 'Unknown'
                      : `$${model.costPer1kTokens}/1k tokens`}
                  </div>
                </div>

                {res.why && res.why.length > 0 && (
                  <div style={{ marginTop: 10 }}>
                    <ul style={wordBullets}>
                      {res.why.map((t) => (
                        <li key={t}>{t}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div style={{ marginTop: 10 }}>
                  <div style={wordLineMuted}>
                    <span style={labelStrong}>Pros:</span>
                  </div>
                  <ul style={wordBullets}>
                    {pros.length ? pros.map((p) => <li key={p}>{p}</li>) : <li>—</li>}
                  </ul>

                  <div style={{ height: 6 }} />

                  <div style={wordLineMuted}>
                    <span style={labelStrong}>Cons:</span>
                  </div>
                  <ul style={wordBullets}>
                    {cons.length ? cons.map((c) => <li key={c}>{c}</li>) : <li>—</li>}
                  </ul>
                </div>

                <div style={{ marginTop: 12 }}>
                  <div style={wordLineMuted}>
                    <span style={labelStrong}>RAG tip:</span> {safe(model.ragTip)}
                  </div>
                  <div style={wordLineMuted}>
                    <span style={labelStrong}>Sources:</span> {safe(sources)}
                  </div>
                </div>

                <div style={{ marginTop: 12 }}>
                  <div style={wordLine}>
                    <span style={labelStrong}>Tags:</span>{' '}
                    {model.tags && model.tags.length ? model.tags.join(', ') : ''}
                  </div>
                </div>

                {warnings.length > 0 && (
                  <div style={{ marginTop: 12 }}>
                    <div style={wordLineMuted}>
                      <span style={labelStrong}>Warnings:</span>
                    </div>
                    <ul style={wordBullets}>
                      {warnings.map((w) => (
                        <li key={w}>{w}</li>
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
