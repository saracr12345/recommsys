// worker/src/routes/chat.ts
import { Router } from "express";
import { prisma } from "../prisma.js";
import { openai } from "../services/openai.js";

const router = Router();

// GET /chat/threads
// returns the user's existing threads for sidebar
router.get("/threads", async (req, res) => {
  try {
    const userId = (req as any).userId as string | number | undefined;
    if (!userId) return res.status(401).json({ ok: false, error: "unauthorized" });

    const threads = await prisma.chatThread.findMany({
      where: { userId: userId as any },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        title: true,
        createdAt: true,
      },
    });

    return res.json({ ok: true, threads });
  } catch (err) {
    console.error("[chat] threads error", err);
    return res.status(500).json({ ok: false, error: "Internal server error" });
  }
});

// GET /chat/thread/:id
// returns messages for a thread
router.get("/thread/:id", async (req, res) => {
  try {
    const userId = (req as any).userId as string | number | undefined;
    if (!userId) return res.status(401).json({ ok: false, error: "unauthorized" });

    const threadId = Number(req.params.id);
    if (!Number.isFinite(threadId)) {
      return res.status(400).json({ ok: false, error: "invalid thread id" });
    }

    const thread = await prisma.chatThread.findFirst({
      where: { id: threadId, userId: userId as any },
      select: { id: true },
    });

    if (!thread) return res.status(404).json({ ok: false, error: "thread not found" });

    const messages = await prisma.chatMessage.findMany({
      where: { threadId },
      orderBy: { createdAt: "asc" },
      take: 200,
      select: {
        role: true,
        content: true,
        createdAt: true,
        model: true,
      },
    });

    return res.json({ ok: true, threadId, messages });
  } catch (err) {
    console.error("[chat] thread error", err);
    return res.status(500).json({ ok: false, error: "Internal server error" });
  }
});

// POST /chat
// body: { threadId?: number, message: string }
router.post("/", async (req, res) => {
  try {
    const userId = (req as any).userId as string | number | undefined;
    if (!userId) return res.status(401).json({ ok: false, error: "unauthorized" });

    const { threadId, message } = req.body || {};
    const text = String(message || "").trim();

    if (!text) {
      return res.status(400).json({ ok: false, error: "message required" });
    }

    // 1) find or create thread
    const thread = threadId
      ? await prisma.chatThread.findFirst({
          where: { id: Number(threadId), userId: userId as any },
        })
      : await prisma.chatThread.create({
          data: { userId: userId as any, title: text.slice(0, 60) },
        });

    if (!thread) {
      return res.status(404).json({ ok: false, error: "thread not found" });
    }

    // 2) save user message
    await prisma.chatMessage.create({
      data: { threadId: thread.id, role: "user", content: text },
    });

    // 3) load context
    const recent = await prisma.chatMessage.findMany({
      where: { threadId: thread.id },
      orderBy: { createdAt: "asc" },
      take: 30,
    });

    // 4) call OpenAI
    const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

    const transcript =
      recent
        .map((m) => {
          const r = String(m.role || "").toLowerCase();
          const role =
            r === "assistant" ? "Assistant" : r === "system" ? "System" : "User";
          return `${role}: ${m.content}`;
        })
        .join("\n") + "\nAssistant:";

    const response = await openai.responses.create({
      model,
      instructions:
        "You are the LLM Advisor assistant. Help users with model recommendations, LLM research questions, and guidance inside this app. Be practical, concise, and truthful.",
      input: transcript,
    });

    const reply = (response.output_text || "").trim() || "…";

    // 5) save assistant reply
    await prisma.chatMessage.create({
      data: { threadId: thread.id, role: "assistant", content: reply, model },
    });

    return res.json({ ok: true, threadId: thread.id, reply });
  } catch (err) {
    console.error("[chat] error", err);
    return res.status(500).json({ ok: false, error: "Internal server error" });
  }
});

export default router;
