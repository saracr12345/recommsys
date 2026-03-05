// worker/src/app.ts
import express from 'express';
import cors from 'cors';
import Parser from 'rss-parser';
import cookieParser from 'cookie-parser';

import modelsRouter, { getModelById } from './routes/models.js';
import recommendRouter from './routes/recommend.js';
import recommendationsRouter from './routes/recommendations.js';
import authRouter from './routes/auth.js';
import chatRouter from './routes/chat.js';

import { authMiddleware, requireAuth } from './middleware/auth.js';
import { redis } from './redis.js';
import { makeGetFeeds } from './services/feeds/getFeeds.js';

// ✅ use your shared prisma singleton
import { prisma } from './prisma.js';

export function createApp() {
  const app = express();
  const parser = new Parser();

  app.set('trust proxy', 1);

  app.use(
    cors({
      origin: process.env.WEB_ORIGIN || 'http://localhost:5173',
      credentials: true,
    }),
  );

  app.use(express.json());
  app.use(cookieParser());
  app.use(authMiddleware);

  // --- ROUTES ---
  app.use('/auth', authRouter);

  // ✅ Preferred API mounts (consistent)
  app.use('/api/models', requireAuth, modelsRouter);
  app.use('/api/recommend', requireAuth, recommendRouter);
  app.use('/api/recommendations', requireAuth, recommendationsRouter);
  app.use('/api/chat', requireAuth, chatRouter);

  // ✅ Backwards-compatible aliases (so existing frontend links don’t break)
  app.use('/models', requireAuth, modelsRouter);
  app.use('/recommend', requireAuth, recommendRouter);
  app.use('/recommendations', requireAuth, recommendationsRouter);
  app.use('/chat', requireAuth, chatRouter);

  // --- EXTRA API ENDPOINTS ---
  // ✅ public model detail (public)
  app.get('/api/models/:id', getModelById);

  // ✅ public model list + arena elo (public)
  app.get('/api/models', async (_req, res) => {
    try {
      const models = await prisma.modelProfile.findMany({
        include: {
          benchmarkResults: {
            where: {
              benchmark: { key: 'arena_elo' },
              source: 'lmsys-arena',
              runId: 'latest',
            },
            orderBy: { recordedAt: 'desc' },
            take: 1,
          },
        },
        orderBy: { updatedAt: 'desc' },
      });

      const out = models.map((m) => {
        const arenaRaw = m.benchmarkResults?.[0]?.scoreRaw ?? null;
        const arenaNorm = m.benchmarkResults?.[0]?.scoreNormalized ?? null; // 0..100
        return {
          id: m.id,
          name: m.name,
          provider: m.provider ?? null,
          family: m.family ?? null,
          modality: m.modality ?? null,
          apiType: m.apiType ?? null,
          license: m.license ?? null,
          contextWindow: m.contextWindow ?? null,
          latencyMs: m.latencyMs ?? null,
          costPer1kTokens: m.costPer1kTokens ?? null,
          domainTags: m.domainTags ?? [],
          source: m.source ?? null,
          url: m.url ?? null,
          arenaElo: arenaRaw,
          arenaScore: arenaNorm, // 0..100
        };
      });

      res.json({ ok: true, models: out });
    } catch (e) {
      console.error('GET /api/models error', e);
      res.status(500).json({ ok: false, error: 'Failed to load models' });
    }
  });

  // --- HEALTH ---
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

  const FEEDS_TTL_SEC = Number(process.env.FEEDS_TTL_SEC || 120);
  const getFeeds = makeGetFeeds({ redis, parser, FEED_SOURCES, FEEDS_TTL_SEC });

  app.get('/feeds', async (_req, res) => {
    try {
      const final = await getFeeds();
      res.json(final);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Failed to fetch feeds' });
    }
  });

  return app;
}