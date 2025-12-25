import { vi } from "vitest";

// Mock the OpenAI client module used by routes/chat.ts
vi.mock("./src/services/openai.js", () => {
  return {
    openai: {
      responses: {
        create: vi.fn(async () => ({
          output_text: "mock reply",
        })),
      },
    },
  };
});
