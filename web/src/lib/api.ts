const BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:8787";

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const r = await fetch(`${BASE}${path}`, init);
  const text = await r.text();
  const data = text ? JSON.parse(text) : {};
  if (!r.ok) throw new Error(data?.error || `Request failed: ${r.status}`);
  return data as T;
}
