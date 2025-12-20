import { useEffect, useState, type CSSProperties } from 'react';
import { pageShell, card } from '@/ui/styles';
import { api } from '@/lib/api';

type RecommendationListItem = {
  id: number;
  createdAt: string;
  task: string;
  privacy: string;
  latency: number;
  context: number;
  topModelName: string | null;
  topModelProvider: string | null;
  confidence: number | null;
};

type RecommendationsResponse = {
  ok: boolean;
  items: RecommendationListItem[];
};

export default function Dashboard() {
  const [items, setItems] = useState<RecommendationListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    try {
      setLoading(true);
      setError('');

      const data = await api<RecommendationsResponse>('/recommendations', {
        method: 'GET',
      });

      if (!data.ok) throw new Error('Failed to load history');

      setItems(data.items ?? []);
    } catch (e: any) {
      setError(e.message || 'Error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        <div style={{ marginBottom: 12 }}>
          <h2
            style={{
              margin: 0,
              fontSize: 20,
              fontWeight: 700,
              color: '#0f172a',
            }}
          >
            Dashboard
          </h2>
          <p
            style={{
              marginTop: 6,
              marginBottom: 0,
              fontSize: 14,
              color: '#475569',
            }}
          >
            Your recent LLM Advisor runs, saved automatically with the task and
            top recommended model.
          </p>
        </div>

        <button
          onClick={load}
          disabled={loading}
          style={{
            fontSize: 13,
            padding: '6px 12px',
            borderRadius: 999,
            border: '1px solid #e2e8f0',
            background: '#f9fafb',
            cursor: loading ? 'default' : 'pointer',
            marginBottom: 12,
          }}
        >
          {loading ? 'Refreshing…' : 'Refresh'}
        </button>

        {error && (
          <div
            style={{
              color: '#b91c1c',
              background: '#fee2e2',
              border: '1px solid #fecaca',
              padding: 10,
              borderRadius: 8,
              marginBottom: 10,
              fontSize: 13,
            }}
          >
            {error}
          </div>
        )}

        {items.length === 0 && !loading && !error && (
          <div
            style={{
              fontSize: 13,
              color: '#6b7280',
            }}
          >
            No recommendations yet. Run the Advisor to see them here.
          </div>
        )}

        <div style={{ display: 'grid', gap: 10 }}>
          {items.map((item) => {
            const created = new Date(item.createdAt);
            const dateStr = created.toLocaleString();

            const conf =
              item.confidence != null
                ? `${(item.confidence * 100).toFixed(0)}%`
                : '—';

            return (
              <div key={item.id} style={rowStyle}>
                <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 4 }}>
                  {dateStr}
                </div>

                <div
                  style={{
                    fontSize: 15,
                    fontWeight: 600,
                    color: '#0f172a',
                    marginBottom: 4,
                  }}
                >
                  Task: {item.task || '—'}
                </div>

                <div
                  style={{
                    fontSize: 13,
                    color: '#374151',
                    lineHeight: 1.5,
                  }}
                >
                  Privacy: {item.privacy || '—'}
                  <br />
                  Latency target: {item.latency} ms · Context needed:{' '}
                  {item.context.toLocaleString()} tokens
                  <br />
                  Top model:{' '}
                  {item.topModelName
                    ? `${item.topModelName} (${item.topModelProvider ?? 'Unknown'})`
                    : '—'}
                  <br />
                  Confidence: {conf}
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
  width: 720,
  maxHeight: '80vh',
  overflow: 'auto',
};

const rowStyle: CSSProperties = {
  padding: 12,
  borderRadius: 12,
  border: '1px solid #e2e8f0',
  background: '#ffffff',
};
