// worker/src/services/openai.ts
import OpenAI from "openai";

let _client: OpenAI | null = null;

export function getOpenAIClient(): OpenAI {
  if (_client) return _client;

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY. Check .env loading / runtime env.");
  }

  _client = new OpenAI({ apiKey });
  return _client;
}