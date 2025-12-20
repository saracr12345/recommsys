import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import Parser from 'rss-parser';
import cookieParser from 'cookie-parser';
import modelsRouter from './routes/models.js';
import recommendRouter from './routes/recommend.js';
import recommendationsRouter from './routes/recommendations.js';
import authRouter from './routes/auth.js';
import { authMiddleware, requireAuth } from './middleware/auth.js';
import { redis } from './redis.js';
import chatRouter from "./routes/chat.js";


// --- APP INIT ---
const app = express();
const parser = new Parser();

app.set('trust proxy', 1); // important if behind a proxy in prod

app.use(
  cors({
    origin: process.env.WEB_ORIGIN || 'http://localhost:5173',
    credentials: true,
  }),
);

app.use(express.json());
app.use(cookieParser());
app.use(authMiddleware); // attaches req.userId / req.userEmail when session cookie is present

// --- ROUTES ---
app.use('/auth', authRouter);
app.use('/models', requireAuth, modelsRouter);
app.use('/recommend', requireAuth, recommendRouter);
app.use('/recommendations', requireAuth, recommendationsRouter);
app.use("/chat", requireAuth, chatRouter);

// --- HEALTH CHECK ---
app.get('/health', (_req, res) => res.json({ ok: true }));

// --- FEED SOURCES ---
const FEED_SOURCES = [
  { id: 'huggingface-blog', name: 'Hugging Face Blog', url: 'https://huggingface.co/blog/feed.xml', type: 'blog' },
  { id: 'openai-news', name: 'OpenAI News', url: 'https://openai.com/news/rss.xml', type: 'blog' },
  { id: 'google-ai-blog', name: 'Google AI Blog', url: 'https://ai.googleblog.com/atom.xml', type: 'blog' },
  { id: 'deepmind-blog', name: 'Google DeepMind Blog', url: 'https://deepmind.com/blog/feed/basic', type: 'blog' },
  { id: 'pytorch-blog', name: 'PyTorch Blog', url: 'https://pytorch.org/feed', type: 'blog' },
  { id: 'ml-cmu-blog', name: 'ML@CMU Blog', url: 'https://blog.ml.cmu.edu/feed/', type: 'blog' },
  { id: 'distill', name: 'Distill', url: 'http://distill.pub/rss.xml', type: 'paper' },
  { id: 'jay-alammar', name: 'Jay Alammar – Visualizing ML', url: 'https://jalammar.github.io/feed.xml', type: 'blog' },
  { id: 'lilian-weng', name: "Lilian Weng – Lil'Log", url: 'https://lilianweng.github.io/lil-log/feed.xml', type: 'blog' },
  {
    id: 'arxiv-llm',
    name: 'arXiv: LLM Papers',
    url: 'https://export.arxiv.org/api/query?search_query=all:%5C%22large+language+model%5C%22&sortBy=submittedDate&sortOrder=descending&max_results=30',
    type: 'paper',
  },
];

// --- UTILITIES ---
function fetchWithTimeout(url: string, ms = 7000) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), ms);
  return fetch(url, { signal: controller.signal }).finally(() => clearTimeout(t));
}

async function fetchTextWithFallbacks(
  url: string,
): Promise<{ mode: 'json' | 'xml'; body: any }> {
  // rss2json
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

  // all origins
  try {
    const r = await fetchWithTimeout(
      `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
      7000,
    );
    if (r.ok) return { mode: 'xml', body: await r.text() };
  } catch {}

  // jina proxy
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

// --- /FEEDS ENDPOINT (with optional caching) ---
const FEEDS_TTL_SEC = Number(process.env.FEEDS_TTL_SEC || 120);

app.get('/feeds', async (_req, res) => {
  try {
    // cache
    try {
      const cached = await redis.get('feeds:combined');
      if (cached) return res.json(JSON.parse(cached));
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
          const items =
            mode === 'json' ? parseRssJson(body, s) : await parseXml(body as string, s);

          try {
            await redis.set(
              `feeds:source:${s.id}`,
              JSON.stringify(items),
              'EX',
              FEEDS_TTL_SEC,
            );
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

    res.json(final);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to fetch feeds' });
  }
});

// --- START SERVER ---
const DEFAULT_PORT = Number(process.env.PORT || 8787);
let server: any = null;

function start(port: number) {
  server = app.listen(port, () =>
    console.log(`worker listening on http://localhost:${port}`),
  );
  server.on('error', (err: any) => {
    if (err?.code === 'EADDRINUSE') {
      console.warn(`Port ${port} in use; retrying on ${port + 1}...`);
      setTimeout(() => start(port + 1), 500);
    } else {
      console.error(err);
    }
  });
}

function gracefulShutdown() {
  if (server) server.close(() => process.exit(0));
  else process.exit(0);
}

process.once('SIGUSR2', () => {
  gracefulShutdown();
  setTimeout(() => process.kill(process.pid, 'SIGUSR2'), 50);
});
process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);

start(DEFAULT_PORT);
