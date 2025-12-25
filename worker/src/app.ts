// worker/src/app.ts
import express from 'express';
import cors from 'cors';
import Parser from 'rss-parser';
import cookieParser from 'cookie-parser';

import modelsRouter from './routes/models.js';
import recommendRouter from './routes/recommend.js';
import recommendationsRouter from './routes/recommendations.js';
import authRouter from './routes/auth.js';
import chatRouter from './routes/chat.js';

import { authMiddleware, requireAuth } from './middleware/auth.js';
import { redis } from './redis.js';
import { makeGetFeeds } from './services/feeds/getFeeds.js';

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
  app.use('/models', requireAuth, modelsRouter);
  app.use('/recommend', requireAuth, recommendRouter);
  app.use('/recommendations', requireAuth, recommendationsRouter);
  app.use('/chat', requireAuth, chatRouter);

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
