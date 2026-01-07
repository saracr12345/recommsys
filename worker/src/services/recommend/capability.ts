// worker/src/services/recommend/capability.ts

export function capabilityScore(model: {
    provider?: string | null;
    family?: string | null;
    name?: string | null;
    domainTags?: string[];
  }) {
    const tags = (model.domainTags ?? []).map((t) => String(t).toLowerCase());
    const fam = String(model.family ?? "").toLowerCase();
    const name = String(model.name ?? "").toLowerCase();
    const provider = String(model.provider ?? "").toLowerCase();
  
    // hard demotions
    if (tags.includes("deprecated")) return 0.30;
    if (tags.includes("legacy")) return 0.45;
  
    // OpenAI family heuristics (tune later as catalog grows)
    if (provider.includes("openai")) {
      if (name.includes("gpt-4.1") || fam.includes("gpt-4.1")) return 0.92;
      if (name.includes("gpt-4o") || fam.includes("gpt-4o")) return 0.88;
      if (name.includes("gpt-4") || fam.includes("gpt-4")) return 0.82;
  
      // reasoning series / o-series
      if (name.includes("o4") || fam.includes("o4") || tags.includes("reasoning")) return 0.90;
  
      if (name.includes("gpt-3.5") || fam.includes("gpt-3.5")) return 0.62;
      if (name.includes("davinci")) return 0.48;
      if (name.includes("babbage")) return 0.40;
    }
  
    // generic bumps
    if (tags.includes("reasoning") || tags.includes("analysis")) return 0.75;
    if (tags.includes("enterprise")) return 0.70;
  
    return 0.60;
  }
  