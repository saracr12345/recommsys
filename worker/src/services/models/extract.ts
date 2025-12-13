import type { LlmModelProfile } from "@recommsys/shared";

// rule based nlp
export function extractModelProfile(text: string): Partial<LlmModelProfile> {
  const lower = text.toLowerCase();

  return {
    family: lower.includes("llama")
      ? "Llama"
      : lower.includes("mistral")
        ? "Mistral"
        : lower.includes("gpt")
          ? "GPT"
          : undefined,

    domainTags: /finance|market|stock|trading|risk/.test(lower)
      ? ["finance"]
      : ["general"],
  };
}
