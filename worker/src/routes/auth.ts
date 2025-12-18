// worker/src/routes/auth.ts
import { Router } from 'express';
import argon2 from 'argon2';
import { prisma } from '../prisma.js';
import {
  authMiddleware,
  createSession,
  setSessionCookie,
  destroySession,
  clearSessionCookie,
} from '../middleware/auth.js';

const router = Router();

// Strong Argon2id parameters
const ARGON2_OPTS: argon2.Options = {
  type: argon2.argon2id,
  memoryCost: 2 ** 16, // 64 MB
  timeCost: 3,
  parallelism: 1,
};

function isValidEmail(email: string): boolean {
  return /\S+@\S+\.\S+/.test(email);
}

function isStrongEnoughPassword(pw: string): boolean {
  return typeof pw === 'string' && pw.length >= 8;
}

// POST /auth/signup
router.post('/signup', async (req, res) => {
  try {
    let { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ ok: false, error: 'Missing email or password' });
    }

    email = String(email).toLowerCase();

    if (!isValidEmail(email)) {
      return res.status(400).json({ ok: false, error: 'Invalid email' });
    }
    if (!isStrongEnoughPassword(password)) {
      return res.status(400).json({ ok: false, error: 'Password too short (min 8 chars)' });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ ok: false, error: 'User already exists' });
    }

    const hash = await argon2.hash(password, ARGON2_OPTS);

    const user = await prisma.user.create({
      data: { email, password: hash },
      select: { id: true, email: true },
    });

    const sid = await createSession(user.id, user.email);
    setSessionCookie(res, sid);

    return res.json({ ok: true, user });
  } catch (err) {
    console.error('[auth/signup] error', err);
    return res.status(500).json({ ok: false, error: 'Internal error' });
  }
});

// POST /auth/login
router.post('/login', async (req, res) => {
  try {
    let { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ ok: false, error: 'Missing email or password' });
    }

    email = String(email).toLowerCase();

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, password: true },
    });

    const invalidMsg = { ok: false, error: 'Invalid credentials' };
    if (!user) return res.status(401).json(invalidMsg);

    const ok = await argon2.verify(user.password, password, ARGON2_OPTS);
    if (!ok) return res.status(401).json(invalidMsg);

    const sid = await createSession(user.id, user.email);
    setSessionCookie(res, sid);

    return res.json({ ok: true, user: { id: user.id, email: user.email } });
  } catch (err) {
    console.error('[auth/login] error', err);
    return res.status(500).json({ ok: false, error: 'Internal error' });
  }
});

// POST /auth/logout
router.post('/logout', authMiddleware, async (req, res) => {
  try {
    if (req.sessionId) {
      await destroySession(req.sessionId);
    }
    clearSessionCookie(res);
    return res.json({ ok: true });
  } catch (err) {
    console.error('[auth/logout] error', err);
    return res.status(500).json({ ok: false, error: 'Internal error' });
  }
});

// GET /auth/me
router.get('/me', authMiddleware, (req, res) => {
  if (!req.userId) return res.json({ ok: true, user: null });
  return res.json({
    ok: true,
    user: { id: req.userId, email: req.userEmail },
  });
});

export default router;
