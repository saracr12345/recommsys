import { Router } from "express";
import { prisma } from "../prisma.js";
import { openai } from "../services/openai.js";

const router = Router();

// POST /chat
// body: { threadId?: number, message: string }
router.post("/", async (req, res) => {
  try {
    const userId = req.userId!;
    const { threadId, message } = req.body || {};
    const text = String(message || "").trim();

    if (!text) {
      return res.status(400).json({ ok: false, error: "message required" });
    }

    // 1) find or create a thread for this user
    const thread = threadId
      ? await prisma.chatThread.findFirst({
          where: { id: Number(threadId), userId },
        })
      : await prisma.chatThread.create({
          data: { userId, title: text.slice(0, 60) },
        });

    if (!thread) {
      return res.status(404).json({ ok: false, error: "thread not found" });
    }

    // 2) save user message
    await prisma.chatMessage.create({
      data: { threadId: thread.id, role: "user", content: text },
    });

    // 3) load last messages for context
    const recent = await prisma.chatMessage.findMany({
      where: { threadId: thread.id },
      orderBy: { createdAt: "asc" },
      take: 30,
    });

    // 4) call OpenAI (use string input to avoid SDK typing issues)
    const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

    const transcript =
      recent
        .map((m) => {
          const r = String(m.role || "").toLowerCase();
          const role = r === "assistant" ? "Assistant" : r === "system" ? "System" : "User";
          return `${role}: ${m.content}`;
        })
        .join("\n") + "\nAssistant:";

    const response = await openai.responses.create({
      model,
      instructions:
        "You are the LLM Area assistant. Help users with model recommendations, LLM research questions, and guidance inside this app. Be practical, concise, and truthful.",
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
