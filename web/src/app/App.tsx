// src/app/App.tsx
import { useState, type CSSProperties } from 'react';
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
};

type RecommendResponse = {
  ok: boolean;
  results: AdvisorResult[];
};

export default function App() {
  const [task, setTask] = useState('financial sentiment');
  const [privacy, setPrivacy] = useState('Self-host');
  const [latency, setLatency] = useState(1200);
  const [ctx, setCtx] = useState(4000);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<AdvisorResult[]>([]);
  const [error, setError] = useState<string>('');

  async function recommend() {
    setLoading(true);
    setError('');
    setResults([]);

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
    } catch (e: any) {
      setError(e.message || 'Error');
    } finally {
      setLoading(false);
    }
  }

  function confidenceLabel(conf?: number): string {
    if (conf == null) return '';
    if (conf >= 0.75) return 'High';
    if (conf >= 0.5) return 'Medium';
    return 'Low';
  }

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        <div style={{ marginBottom: 12, textAlign: 'center' }}>
          <h2
            style={{
              margin: 0,
              fontSize: 22,
              fontWeight: 700,
              color: colors.textMain,
            }}
          >
            LLM Advisor
          </h2>
          <p
            style={{
              marginTop: 6,
              marginBottom: 0,
              fontSize: 14,
              color: colors.textMuted,
            }}
          >
            Input your task → get the best model ranked for you.
          </p>
        </div>

        {/* FORM FIELDS */}
        <div style={{ display: 'grid', gap: 12 }}>
          {/* TASK FIELD */}
          <div style={fieldStyle}>
            <div style={labelStyle}>Task</div>
            <input
              value={task}
              onChange={(e) => setTask(e.target.value)}
              placeholder="e.g. financial sentiment, classification, extraction"
              style={inputStyle}
            />
          </div>

          {/* PRIVACY FIELD */}
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

          {/* LATENCY */}
          <div style={fieldStyle}>
            <div style={labelStyle}>Latency target (ms)</div>
            <input
              type="number"
              value={latency}
              onChange={(e) => setLatency(parseInt(e.target.value || '0'))}
              style={inputStyle}
            />
          </div>

          {/* CONTEXT */}
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

        {/* BUTTON */}
        <button onClick={recommend} disabled={loading} style={buttonStyle}>
          {loading ? 'Thinking…' : 'Recommend'}
        </button>

        {/* ERROR */}
        {error && <div style={errorStyle}>{error}</div>}

        {/* RESULTS */}
        <div style={{ marginTop: 16, display: 'grid', gap: 10 }}>
          {results.length === 0 && !loading && (
            <div style={helperTextStyle}>
              Run a recommendation to see ranked models here.
            </div>
          )}

          {results.map((res, i) => {
            const isTop = i === 0 && res.confidence != null;
            const label = confidenceLabel(res.confidence);

            return (
              <div key={res.model.name} style={resultCardStyle}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 4,
                    gap: 12,
                  }}
                >
                  <div
                    style={{
                      fontSize: 16,
                      fontWeight: 600,
                      color: colors.textMain,
                    }}
                  >
                    #{i + 1} — {res.model.name}
                  </div>

                  {isTop && (
                    <span
                      style={{
                        fontSize: 11,
                        padding: '2px 10px',
                        borderRadius: 999,
                        border: `1px solid ${colors.blueBorder}`,
                        background: colors.blueSoft,
                        color: '#035781',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      Confidence: {res.confidence!.toFixed(2)} ({label})
                    </span>
                  )}
                </div>

                <div
                  style={{
                    fontSize: 13,
                    color: colors.textMain,
                    lineHeight: 1.5,
                  }}
                >
                  Provider: {res.model.provider}
                  <br />
                  Context: {res.model.context.toLocaleString()} tokens
                  <br />
                  Latency: {res.model.latencyMs} ms
                  <br />
                  Cost: ${res.model.costPer1kTokens}/1k tokens
                  <br />
                  Tags: {res.model.tags.join(', ') || '–'}
                </div>

                {/* Why explanations */}
                {res.why && res.why.length > 0 && (
                  <ul
                    style={{
                      marginTop: 6,
                      marginBottom: 0,
                      paddingLeft: 18,
                      fontSize: 12,
                      color: colors.textMuted,
                    }}
                  >
                    {res.why.map((w) => (
                      <li key={w}>{w}</li>
                    ))}
                  </ul>
                )}

                {/* Factor breakdown */}
                {res.factors && (
                  <div
                    style={{
                      marginTop: 6,
                      fontSize: 11,
                      color: colors.textMuted,
                    }}
                  >
                    Cost score: {res.factors.costScore.toFixed(2)} ·{' '}
                    Latency score: {res.factors.latencyScore.toFixed(2)} ·{' '}
                    Context score: {res.factors.ctxScore.toFixed(2)}
                  </div>
                )}

                <div
                  style={{
                    marginTop: 6,
                    fontSize: 13,
                    fontWeight: 600,
                    color: colors.emeraldDark,
                  }}
                >
                  Score: {res.score.toFixed(2)}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ---------- styles ---------- */

const pageStyle: CSSProperties = { ...pageShell };

const cardStyle: CSSProperties = {
  ...card,
  width: 560,
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

const resultCardStyle: CSSProperties = {
  padding: 14,
  borderRadius: 14,
  background: colors.white,
  border: `1px solid ${colors.borderSubtle}`,
  boxShadow: '0 4px 14px rgba(0,0,0,0.04)',
};
