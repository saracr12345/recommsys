import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { createApp } from "../../src/app.js";
import { prisma } from "../../src/prisma.js";

const TEST_EMAIL = "test@example.com";
const TEST_PASSWORD = "test-password-123";

// Keep test data namespaced so cleanup is safe + predictable
const TEST_MODEL_IDS = ["test-gpt-mini", "test-llama"];

async function seedModels() {
  await prisma.modelProfile.upsert({
    where: { id: "test-gpt-mini" },
    update: {},
    create: {
      id: "test-gpt-mini",
      name: "Test GPT Mini",
      provider: "OpenAI",
      family: "GPT",
      modality: "text",
      apiType: "saas",
      contextWindow: 128000,
      latencyMs: 900,
      costPer1kTokens: 0.0002,
      domainTags: ["finance", "analysis"] as any,
      pros: ["Fast"] as any,
      cons: ["Smaller"] as any,
      ragTips: ["Use chunking"] as any,
      typicalUseCases: ["Sentiment"] as any,
      strengths: ["Low latency"] as any,
      limitations: ["Not best for deep reasoning"] as any,
      source: "test",
      url: "https://example.com/test-model",
    },
  });

  await prisma.modelProfile.upsert({
    where: { id: "test-llama" },
    update: {},
    create: {
      id: "test-llama",
      name: "Test LLaMA",
      provider: "Meta",
      family: "LLaMA",
      modality: "text",
      apiType: "self-hosted",
      contextWindow: 8192,
      latencyMs: 2500,
      costPer1kTokens: 0.0,
      domainTags: ["open-source"] as any,
      pros: ["Self-hosted"] as any,
      cons: ["Slower"] as any,
      ragTips: [] as any,
      typicalUseCases: ["General"] as any,
      strengths: ["Privacy"] as any,
      limitations: ["Ops overhead"] as any,
      source: "test",
      url: "https://example.com/test-llama",
    },
  });
}

async function cleanupUserData(email: string) {
  const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (!user) return;

  // Delete in dependency order (child → parent)
  await prisma.savedRecommendation.deleteMany({ where: { userId: user.id } });
  await prisma.chatMessage.deleteMany({ where: { thread: { userId: user.id } } });
  await prisma.chatThread.deleteMany({ where: { userId: user.id } });
  await prisma.recommendationEvent.deleteMany({ where: { userId: user.id } });
  await prisma.user.deleteMany({ where: { id: user.id } });
}

async function cleanupModels() {
  await prisma.modelProfile.deleteMany({ where: { id: { in: TEST_MODEL_IDS } } });
}

describe("Recommend + Recommendations (integration, production auth)", () => {
  const app = createApp();
  const agent = request.agent(app); // cookie jar

  beforeAll(async () => {
    // deterministic catalog
    await seedModels();

    // clean slate user
    await cleanupUserData(TEST_EMAIL);

    // real signup + login (production auth flow)
    await agent.post("/auth/signup").send({ email: TEST_EMAIL, password: TEST_PASSWORD }).expect(200);
    await agent.post("/auth/login").send({ email: TEST_EMAIL, password: TEST_PASSWORD }).expect(200);
  });

  afterAll(async () => {
    await cleanupUserData(TEST_EMAIL);
    await cleanupModels();
    await prisma.$disconnect();
  });

  it("POST /recommend returns results and logs DB event", async () => {
    const res = await agent
      .post("/recommend")
      .send({ task: "financial sentiment", privacy: "Cloud", latency: 1500, context: 4000 })
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(res.body.eventId).toBeTypeOf("number");

    const single = res.body.results?.singleModels ?? [];
    expect(Array.isArray(single)).toBe(true);
    expect(single.length).toBeGreaterThan(0);

    const event = await prisma.recommendationEvent.findUnique({
      where: { id: res.body.eventId },
    });
    expect(event).toBeTruthy();
    expect(event?.task).toContain("financial");
  });

  it("GET /recommendations history exposes a non-null topModelName (regression test)", async () => {
    // create one recommendation to ensure history has at least 1 row
    const rec = await agent
      .post("/recommend")
      .send({ task: "financial sentiment", privacy: "Cloud", latency: 1500, context: 4000 })
      .expect(200);

    const topNameFromRecommend =
      rec.body.results?.singleModels?.[0]?.model?.name ?? null;

    expect(topNameFromRecommend).toBeTruthy();

    const history = await agent.get("/recommendations").expect(200);

    expect(history.body.ok).toBe(true);
    expect(Array.isArray(history.body.items)).toBe(true);
    expect(history.body.items.length).toBeGreaterThan(0);

    const first = history.body.items[0];
    expect(first.topModelName).toBeTruthy();

    // strongest assertion: the API history matches the recommendation payload
    expect(first.topModelName).toBe(topNameFromRecommend);
  });

  it("Contract: /recommend response shape + score bounds", async () => {
    const res = await agent
      .post("/recommend")
      .send({ task: "financial sentiment", privacy: "Cloud", latency: 1500, context: 4000 })
      .expect(200);

    const single = res.body.results.singleModels as any[];
    expect(Array.isArray(single)).toBe(true);
    expect(single.length).toBeGreaterThan(0);

    for (const r of single) {
      // required top-level keys
      expect(r).toHaveProperty("model");
      expect(r).toHaveProperty("score");
      expect(r).toHaveProperty("why");
      expect(r).toHaveProperty("warnings");

      // bounds
      expect(typeof r.score).toBe("number");
      expect(r.score).toBeGreaterThanOrEqual(0);
      expect(r.score).toBeLessThanOrEqual(1);

      if (r.confidence != null) {
        expect(typeof r.confidence).toBe("number");
        expect(r.confidence).toBeGreaterThanOrEqual(0);
        expect(r.confidence).toBeLessThanOrEqual(1);
      }

      expect(Array.isArray(r.warnings)).toBe(true);
      expect(Array.isArray(r.why)).toBe(true);

      // model contract (minimal but strict enough)
      const m = r.model;
      expect(typeof m.name).toBe("string");
      expect(typeof m.provider).toBe("string");
      expect(Array.isArray(m.tags)).toBe(true);
    }
  });
  it("POST /recommendations/saved toggles save and affects saved list", async () => {
    const rec = await agent
      .post("/recommend")
      .send({ task: "financial sentiment", privacy: "Cloud", latency: 1500, context: 4000 })
      .expect(200);
  
    const eventId = rec.body.eventId;
    expect(eventId).toBeTypeOf("number");
  
    const save1 = await agent
      .post("/recommendations/saved")
      .send({ eventId })
      .expect(200);
  
    expect(save1.body.ok).toBe(true);
    expect(save1.body.saved).toBe(true);
  
    const list1 = await agent.get("/recommendations/saved").expect(200);
    expect(list1.body.ok).toBe(true);
  
    // Stronger than “length > 0”: ensures the saved item is the one we saved
    expect((list1.body.items ?? []).some((x: any) => x.eventId === eventId)).toBe(true);
  
    const save2 = await agent
      .post("/recommendations/saved")
      .send({ eventId })
      .expect(200);
  
    expect(save2.body.ok).toBe(true);
    expect(save2.body.saved).toBe(false);
  });
  
});
