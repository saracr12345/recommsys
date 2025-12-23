import { Router } from 'express';
import { prisma } from '../prisma.js';

const router = Router();

// ---------- HISTORY: last 50 recommendation events for this user ----------

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

// ---------- SAVED DASHBOARDS ----------

// GET /recommendations/saved - list saved dashboards for THIS user
router.get('/saved', async (req, res) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ ok: false, error: 'unauthorized' });
    }

    const saved = await prisma.savedRecommendation.findMany({
      where: { userId, archived: false },
      orderBy: { createdAt: 'desc' },
      include: { event: true },
    });

    const items = saved.map((s) => {
      const e = s.event;
      const results = (e.results as any[]) ?? [];
      const top = results[0] ?? null;
      const topModel = top?.model ?? null;

      return {
        id: s.id,
        createdAt: e.createdAt,
        eventId: e.id,

        // simple title 
        title: e.task || null,

        // map DB field `note` → API field `notes`
        notes: s.note ?? null,

        task: e.task,
        privacy: e.privacy,
        latency: e.latency,
        context: e.context,

        topModelName: topModel?.name ?? null,
        topModelProvider: topModel?.provider ?? null,
        confidence: top?.confidence ?? null,
      };
    });

    return res.json({ ok: true, items });
  } catch (err) {
    console.error('[recommendations/saved] error', err);
    return res
      .status(500)
      .json({ ok: false, error: 'failed to load saved dashboards' });
  }
});

// POST /recommendations/saved - toggle save/unsave for an event
// body: { eventId: number }
router.post('/saved', async (req, res) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ ok: false, error: 'unauthorized' });
    }

    const eventId = Number(req.body?.eventId);
    if (!eventId || Number.isNaN(eventId)) {
      return res.status(400).json({ ok: false, error: 'invalid eventId' });
    }

    const existing = await prisma.savedRecommendation.findUnique({
      where: { userId_eventId: { userId, eventId } },
    });

    let nowSaved: boolean;

    if (!existing || existing.archived) {
      // create or un-archive
      await prisma.savedRecommendation.upsert({
        where: { userId_eventId: { userId, eventId } },
        create: { userId, eventId, note: null, archived: false },
        update: { archived: false },
      });
      nowSaved = true;
    } else {
      // toggle to archived
      await prisma.savedRecommendation.update({
        where: { userId_eventId: { userId, eventId } },
        data: { archived: true },
      });
      nowSaved = false;
    }

    const savedCount = await prisma.savedRecommendation.count({
      where: { userId, archived: false },
    });

    return res.json({ ok: true, saved: nowSaved, savedCount });
  } catch (err) {
    console.error('[recommendations/saved POST] error', err);
    return res
      .status(500)
      .json({ ok: false, error: 'failed to toggle saved dashboard' });
  }
});

// PATCH /recommendations/saved/:id - update note
router.patch('/saved/:id', async (req, res) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ ok: false, error: 'unauthorized' });
    }

    const id = Number(req.params.id);
    if (!id || Number.isNaN(id)) {
      return res.status(400).json({ ok: false, error: 'invalid id' });
    }

    const notes = String(req.body?.notes ?? '');
    const trimmed = notes.slice(0, 2000);

    await prisma.savedRecommendation.updateMany({
      where: { id, userId },
      data: { note: trimmed },
    });

    return res.json({ ok: true });
  } catch (err) {
    console.error('[recommendations/saved PATCH] error', err);
    return res
      .status(500)
      .json({ ok: false, error: 'failed to update note' });
  }
});

// DELETE /recommendations/saved/:id - soft delete (archive)
router.delete('/saved/:id', async (req, res) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ ok: false, error: 'unauthorized' });
    }

    const id = Number(req.params.id);
    if (!id || Number.isNaN(id)) {
      return res.status(400).json({ ok: false, error: 'invalid id' });
    }

    await prisma.savedRecommendation.updateMany({
      where: { id, userId },
      data: { archived: true },
    });

    return res.json({ ok: true });
  } catch (err) {
    console.error('[recommendations/saved DELETE] error', err);
    return res
      .status(500)
      .json({ ok: false, error: 'failed to delete dashboard' });
  }
});

// ---------- SINGLE EVENT DETAIL ----------

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
