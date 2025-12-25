// worker/src/middleware/auth.ts
import type { Request, Response, NextFunction } from 'express';
import { randomBytes } from 'crypto';
import { redis } from '../redis.js';

const SESSION_COOKIE_NAME = 'sid';
const SESSION_TTL_SECONDS = Number(
  process.env.SESSION_TTL_SECONDS || 60 * 60 * 24 * 7, // 7 days
);

type SessionData = {
  userId: number;
  email: string;
};

function sessionKey(id: string) {
  return `session:${id}`;
}

// ---- session helpers ----

export async function createSession(userId: number, email: string): Promise<string> {
  const id = randomBytes(32).toString('hex'); // 256-bit session id
  const data: SessionData = { userId, email };

  await redis.set(sessionKey(id), JSON.stringify(data), 'EX', SESSION_TTL_SECONDS);
  return id;
}

export async function getSession(id: string): Promise<SessionData | null> {
  const raw = await redis.get(sessionKey(id));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SessionData;
  } catch {
    return null;
  }
}

export async function destroySession(id: string): Promise<void> {
  await redis.del(sessionKey(id));
}

// ---- cookie helpers ----

export function setSessionCookie(res: Response, sessionId: string) {
  const isProd = process.env.NODE_ENV === 'production';

  res.cookie(SESSION_COOKIE_NAME, sessionId, {
    httpOnly: true,
    secure: isProd,      // MUST be true in prod over HTTPS
    sameSite: 'lax',
    maxAge: SESSION_TTL_SECONDS * 1000,
    path: '/',
  });
}

export function clearSessionCookie(res: Response) {
  res.clearCookie(SESSION_COOKIE_NAME, { path: '/' });
}

// ---- middlewares ----

export async function authMiddleware(req: Request, _res: Response, next: NextFunction) {
  const sid = (req as any).cookies?.[SESSION_COOKIE_NAME];
  if (!sid) return next();

  try {
    const session = await getSession(sid);
    if (session) {
      req.userId = session.userId;
      req.userEmail = session.email;
      req.sessionId = sid;
    }
  } catch (e) {
    console.error('[auth] failed to load session', e);
  }

  return next();
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.userId) {
    return res.status(401).json({ ok: false, error: 'unauthorized' });
  }
  return next();
}
