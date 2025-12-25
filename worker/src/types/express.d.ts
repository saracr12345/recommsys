import "express";

declare global {
  namespace Express {
    interface Request {
      userId?: number;
      userEmail?: string;
      sessionId?: string;
    }
  }
}

export {};
