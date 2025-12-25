import { describe, it, expect } from "vitest";
import { taskProfile, privacyAllows, modalityAllows, jaccard } from "../../src/services/recommend/scoring.js";

describe("scoring basics", () => {
  it("detects finance tasks", () => {
    const p = taskProfile("10-K risk analysis");
    expect(p.finance).toBe(true);
    expect(p.highStakes).toBe(true);
    expect(p.subtype).toBe("filings");
  });

  it("privacyAllows self-host", () => {
    expect(privacyAllows("Self-host", "self-hosted")).toBe(true);
    expect(privacyAllows("Self-host", "saas")).toBe(false);
  });

  it("modalityAllows text tasks", () => {
    expect(modalityAllows("summarization", "text")).toBe(true);
    expect(modalityAllows("summarization", "text+image")).toBe(true);
  });

  it("jaccard returns expected value", () => {
    expect(jaccard(new Set(["a","b"]), new Set(["b","c"]))).toBeCloseTo(1/3);
  });
});
