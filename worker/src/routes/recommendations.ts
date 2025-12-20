import { Router } from 'express';
import { prisma } from '../prisma.js';

const router = Router();

// GET /recommendations  - list last 50 events for THIS user
router.get('/', async (req, res) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ ok: false, error: 'unauthorized' });
    }

    const events = await prisma.recommendationEvent.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const items = events.map((e) => {
      const results = (e.results as any[]) ?? [];
      const top = results[0] ?? null;
      const topModel = top?.model ?? null;

      return {
        id: e.id,
        createdAt: e.createdAt,
        task: e.task,
        privacy: e.privacy,
        latency: e.latency,
        context: e.context,
        topModelName: topModel?.name ?? null,
        topModelProvider: topModel?.provider ?? null,
        confidence: top?.confidence ?? null,
      };
    });

    res.json({ ok: true, items });
  } catch (err) {
    console.error('[recommendations] error', err);
    res.status(500).json({ ok: false, error: 'failed to load history' });
  }
});

// GET /recommendations/:id - full event for THIS user
router.get('/:id', async (req, res) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ ok: false, error: 'unauthorized' });
    }

    const id = Number(req.params.id);
    if (!id || Number.isNaN(id)) {
      return res.status(400).json({ ok: false, error: 'invalid id' });
    }

    const event = await prisma.recommendationEvent.findFirst({
      where: { id, userId },
    });

    if (!event) {
      return res.status(404).json({ ok: false, error: 'not found' });
    }

    res.json({ ok: true, event });
  } catch (err) {
    console.error('[recommendations/:id] error', err);
    res.status(500).json({ ok: false, error: 'failed to load event' });
  }
});

export default router;
