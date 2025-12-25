import Parser from 'rss-parser';

export type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export function makeGetFeeds(opts: {
  redis: { get(key: string): Promise<string | null>; set(...args: any[]): Promise<any> };
  parser: Parser;
  FEED_SOURCES: any[];
  FEEDS_TTL_SEC: number;
  fetchFn?: FetchLike;
}) {
  const { redis, parser, FEED_SOURCES, FEEDS_TTL_SEC, fetchFn = globalThis.fetch } = opts;

  function fetchWithTimeout(url: string, ms = 7000) {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), ms);
    return fetchFn(url, { signal: controller.signal }).finally(() => clearTimeout(t));
  }

  async function fetchTextWithFallbacks(url: string): Promise<{ mode: 'json' | 'xml'; body: any }> {
    try {
      const r = await fetchWithTimeout(
        `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(url)}`,
        7000,
      );
      if (r.ok) {
        const data = await r.json();
        if (data?.items) return { mode: 'json', body: data };
      }
    } catch {}

    try {
      const r = await fetchWithTimeout(
        `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
        7000,
      );
      if (r.ok) return { mode: 'xml', body: await r.text() };
    } catch {}

    const r3 = await fetchWithTimeout(
      `https://r.jina.ai/${url.startsWith('http') ? url : 'https://' + url}`,
      7000,
    );
    if (!r3.ok) throw new Error('Fetch failed');
    return { mode: 'xml', body: await r3.text() };
  }

  function parseRssJson(json: any, source: any) {
    const items = json.items || [];
    return items.map((it: any) => ({
      id: it.guid || it.link || `${source.id}:${it.title}`,
      title: it.title || '',
      link: it.link || '',
      date: it.pubDate || it.published || it.updated || new Date().toISOString(),
      source: source.name,
      sourceId: source.id,
      type: source.type,
      author: it.author || it.creator || json.feed?.author || '',
      summary: it.description || it.content || it.contentSnippet || '',
    }));
  }

  async function parseXml(xmlText: string, source: any) {
    const feed = await parser.parseString(xmlText);
    const items = feed.items || [];
    return items.map((it: any, i: number) => ({
      id: it.guid || it.link || `${source.id}:${i}`,
      title: it.title || '',
      link: it.link || '',
      date: it.isoDate || it.pubDate || it.published || it.updated || new Date().toISOString(),
      source: source.name,
      sourceId: source.id,
      type: source.type,
      author: it.author || it.creator || (feed as any).author || '',
      summary: it.contentSnippet || it.summary || it.content || it.description || '',
    }));
  }

  function dedupeAndSort(entries: any[], sort: 'newest' | 'oldest' = 'newest') {
    const seen = new Set<string>();
    const out: any[] = [];
    for (const e of entries) {
      const key = `${(e.title || '').toLowerCase()}__${(e.link || '').toLowerCase()}`;
      if (!seen.has(key)) {
        seen.add(key);
        out.push(e);
      }
    }
    out.sort((a, b) => {
      const da = new Date(a.date).getTime() || 0;
      const db = new Date(b.date).getTime() || 0;
      return sort === 'oldest' ? da - db : db - da;
    });
    return out;
  }

  return async function getFeeds() {
    try {
      const cached = await redis.get('feeds:combined');
      if (cached) return JSON.parse(cached);
    } catch {}

    const MAX_CONC = 4;
    const batches: any[][] = [];
    for (let i = 0; i < FEED_SOURCES.length; i += MAX_CONC) {
      batches.push(FEED_SOURCES.slice(i, i + MAX_CONC));
    }

    const collected: any[] = [];
    for (const batch of batches) {
      const settled = await Promise.allSettled(
        batch.map(async (s) => {
          try {
            const sourceCache = await redis.get(`feeds:source:${s.id}`);
            if (sourceCache) return JSON.parse(sourceCache);
          } catch {}

          const { mode, body } = await fetchTextWithFallbacks(s.url);
          const items = mode === 'json' ? parseRssJson(body, s) : await parseXml(body as string, s);

          try {
            await redis.set(`feeds:source:${s.id}`, JSON.stringify(items), 'EX', FEEDS_TTL_SEC);
          } catch {}

          return items;
        }),
      );

      for (const r of settled) {
        if (r.status === 'fulfilled') collected.push(...r.value);
      }
    }

    const final = dedupeAndSort(collected, 'newest');

    try {
      await redis.set('feeds:combined', JSON.stringify(final), 'EX', FEEDS_TTL_SEC);
    } catch {}

    return final;
  };
}
