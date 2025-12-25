import { vi } from "vitest";

// Ensure test env + test DB URL are set BEFORE app/prisma are imported in test files.
process.env.NODE_ENV = "test";
if (process.env.DATABASE_URL_TEST) {
  process.env.DATABASE_URL = process.env.DATABASE_URL_TEST;
}

// Mock ONLY the OpenAI wrapper used by chat route.
vi.mock("../src/services/openai.js", () => ({
  openai: {
    responses: {
      create: vi.fn(async () => ({ output_text: "mock reply" })),
    },
  },
}));

