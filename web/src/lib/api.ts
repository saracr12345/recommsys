// web/src/lib/api.ts
const BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:8787';

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const r = await fetch(`${BASE}${path}`, {
    // THIS is critical: without it, browser ignores Set-Cookie from the server
    credentials: 'include',
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });

  const text = await r.text();
  const data = text ? JSON.parse(text) : {};

  if (!r.ok) {
    throw new Error((data as any)?.error || `Request failed: ${r.status}`);
  }

  return data as T;
}

