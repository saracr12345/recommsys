// worker/scripts/seedModels.ts
import { PrismaClient, Prisma } from "@prisma/client";

console.log("🚀 seedModels.ts started");

const prisma = new PrismaClient();

/**
 * Normalize tags so recommender can rely on them:
 * - lowercase
 * - trim
 * - de-dupe
 * - remove empty
 */
function normTags(tags: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();

  for (const raw of tags ?? []) {
    const t = String(raw ?? "").trim().toLowerCase();
    if (!t) continue;
    if (seen.has(t)) continue;
    seen.add(t);
    out.push(t);
  }

  return out;
}

/**
 * Auto-enrich tags based on id/name/family/modality.
 * This makes rankings feel "business tier" even if manual tags are imperfect.
 *
 * IMPORTANT:
 * - We do NOT auto-add "deprecated".
 * - We DO auto-add: preview, legacy, rag/retrieval, coding, reasoning/analysis, vision/audio.
 */
function enrichTags(m: {
  id: string;
  name: string;
  family: string;
  modality: string;
  domainTags: string[];
}): string[] {
  const tags = new Set(normTags(m.domainTags));
  const id = String(m.id).toLowerCase();
  const name = String(m.name).toLowerCase();
  const fam = String(m.family).toLowerCase();
  const modality = String(m.modality).toLowerCase();

  // --- stability signals ---
  if (id.includes("preview") || name.includes("preview")) tags.add("preview");

  // legacy families + older OpenAI lines
  if (
    tags.has("legacy") ||
    fam.includes("legacy") ||
    name.includes("davinci") ||
    name.includes("babbage") ||
    name.includes("gpt-3.5")
  ) {
    tags.add("legacy");
  }

  // --- RAG / retrieval signals ---
  if (id.includes("search") || tags.has("search") || tags.has("web")) {
    tags.add("retrieval");
    tags.add("rag");
  }

  // --- coding signals ---
  if (id.includes("codex") || tags.has("code") || tags.has("programming")) {
    tags.add("coding");
  }

  // --- reasoning signals ---
  if (fam.startsWith("o") || fam.includes("o4") || tags.has("reasoning")) {
    tags.add("reasoning");
    tags.add("analysis");
  }

  // --- modality hints ---
  if (modality.includes("image")) tags.add("vision");
  if (modality.includes("audio")) tags.add("audio");

  return Array.from(tags);
}

const models: Array<{
  id: string;
  name: string;
  provider: string;
  family: string;
  modality: string;
  domainTags: string[];
  apiType: string;
  contextWindow: number;
  costPer1kTokens: number;
  latencyMs: number;
  license: string;
  source: string;
  url: string;

  pros: string[];
  cons: string[];
  ragTips: string[];
  typicalUseCases: string[];
  strengths: string[];
  limitations: string[];
}> = [
  {
    id: "gpt-4o-mini",
    name: "GPT-4o Mini",
    provider: "OpenAI",
    family: "GPT-4o",
    modality: "text",
    domainTags: ["general", "analysis", "finance"],
    apiType: "saas",
    contextWindow: 128000,
    costPer1kTokens: 0.00015,
    latencyMs: 1290, //measured end to end  470 ms for 1st token
    license: "proprietary",
    source: "openai-docs, openrouter.ai",
    url: "https://platform.openai.com/docs/models",

    pros: [
      "Extremely cost-efficient",
      "Fast response times",
      "Large context window for its size",
    ],
    cons: [
      "Weaker reasoning than larger GPT models",
      "Not ideal for complex multi-step logic",
    ],
    ragTips: [
      "Chunk documents aggressively to reduce noise",
      "Use reranking for finance-heavy corpora",
    ],
    typicalUseCases: ["Classification", "Summarisation", "Sentiment analysis"],
    strengths: ["Low latency", "High throughput"],
    limitations: ["Limited deep reasoning"],
  },

  {
    id: "gpt-4o",
    name: "GPT-4o",
    provider: "OpenAI",
    family: "GPT-4o",
    modality: "text+image",
    domainTags: ["general", "analysis"],
    apiType: "saas",
    contextWindow: 128000,
    costPer1kTokens: 0.005,
    latencyMs: 1300,  //measured end to end  350 ms for 1st token
    license: "proprietary",
    source: "openai-docs",
    url: "https://platform.openai.com/docs/models",

    pros: [
      "Strong reasoning and instruction-following",
      "Multimodal support",
      "Reliable across many tasks",
    ],
    cons: ["More expensive than mini variants", "Cloud-only deployment"],
    ragTips: ["Use hybrid search (BM25 + embeddings)", "Provide explicit system instructions"],
    typicalUseCases: ["RAG systems", "Decision support", "Data extraction"],
    strengths: ["Balanced intelligence", "Strong generalization"],
    limitations: ["Cost at scale"],
  },

  {
    id: "gpt-4.1",
    name: "GPT-4.1",
    provider: "OpenAI",
    family: "GPT-4.1",
    modality: "text+image",
    domainTags: ["analysis", "enterprise"],
    apiType: "saas",
    contextWindow: 1047576,
    costPer1kTokens: 0.002,
    latencyMs: 2000, //measured end to end  1000 ms for 1st token
    license: "proprietary",
    source: "openai-docs",
    url: "https://platform.openai.com/docs/models",

    pros: ["Massive context window", "Strong analytical reasoning"],
    cons: ["Higher latency", "Overkill for small tasks"],
    ragTips: ["Store entire documents without chunking", "Use metadata filters sparingly"],
    typicalUseCases: ["Long document analysis", "Legal or financial filings"],
    strengths: ["Long-context understanding"],
    limitations: ["Latency-sensitive workloads"],
  },

  {
    id: "o4-mini",
    name: "o4-mini",
    provider: "OpenAI",
    family: "o4",
    modality: "text",
    domainTags: ["analysis", "reasoning"],
    apiType: "saas",
    contextWindow: 200000,
    costPer1kTokens: 0.0015,
    latencyMs: 1500, //measured end to end 500 ms for 1st token
    license: "proprietary",
    source: "openai-docs",
    url: "https://platform.openai.com/docs/models",

    pros: ["Optimized for structured reasoning", "Cost-efficient for reasoning tasks"],
    cons: ["Less fluent language generation"],
    ragTips: ["Use for reasoning after retrieval", "Pair with a generator model"],
    typicalUseCases: ["Chain-of-thought reasoning", "Verification"],
    strengths: ["Reasoning efficiency"],
    limitations: ["Natural language quality"],
  },

  {
    id: "babbage-002",
    name: "babbage-002",
    provider: "OpenAI",
    family: "GPT-3.5/legacy",
    modality: "text",
    domainTags: ["general"],
    apiType: "saas",
    contextWindow: 2048,
    costPer1kTokens: 0.0004,
    latencyMs: 1800, // measured end to end 700 ms for 1st token
    license: "proprietary",
    source: "openai-docs",
    url: "https://platform.openai.com/docs/models",

    pros: ["Simple, cheap legacy text model"],
    cons: ["Legacy capability vs modern models"],
    ragTips: ["Prefer newer models unless you specifically need this"],
    typicalUseCases: ["Basic text tasks"],
    strengths: ["Low cost"],
    limitations: ["Weaker reasoning and quality vs modern models"],
  },

  {
    id: "chatgpt-4o-latest",
    name: "ChatGPT-4o Latest",
    provider: "OpenAI",
    family: "GPT-4o",
    modality: "text+image",
    domainTags: ["general", "analysis"],
    apiType: "saas",
    contextWindow: 128000,
    costPer1kTokens: 0.0025,
    latencyMs: 1300, // measured end to end 500 ms for 1st token
    license: "proprietary",
    source: "openai-docs",
    url: "https://platform.openai.com/docs/models",

    pros: ["Strong general performance", "Multimodal (image input)"],
    cons: ["Higher cost than small models", "Cloud-only"],
    ragTips: ["Use hybrid retrieval + clear system instruction"],
    typicalUseCases: ["General assistant", "RAG", "Extraction"],
    strengths: ["Balanced quality", "Multimodal"],
    limitations: ["Cost/latency at scale"],
  },

  {
    id: "chatgpt-image-latest",
    name: "chatgpt-image-latest",
    provider: "OpenAI",
    family: "Image",
    modality: "image",
    domainTags: ["vision", "creative"],
    apiType: "saas",
    contextWindow: 0,          // not really applicable 0
    costPer1kTokens: 0,        // image pricing isn’t token-based  0 
    latencyMs: 2500,
    license: "proprietary",
    source: "openai-docs",
    url: "https://platform.openai.com/docs/models",

    pros: ["Image generation/editing for ChatGPT workflows"],
    cons: ["Not a text model", "Different pricing model"],
    ragTips: ["Use for image outputs only"],
    typicalUseCases: ["Image generation", "Image edits"],
    strengths: ["Visual generation"],
    limitations: ["Not applicable for text-only tasks"],
  },
  
  {
    id: "codex-mini-latest",
    name: "Codex Mini (Latest)",
    provider: "OpenAI",
    family: "Codex",
    modality: "text",
    domainTags: ["code", "programming", "reasoning"],
    apiType: "saas",
  
    contextWindow: 200000,
    costPer1kTokens: 0.0015,
    latencyMs: 1500,
  
    license: "proprietary",
    source: "openai-docs",
    url: "https://platform.openai.com/docs/models",
  
    pros: [
      "Optimized for code reasoning",
      "Fast feedback for programming tasks",
      "Designed for CLI-based workflows",
    ],
    cons: [
      "Not intended for general conversation",
      "Limited non-code capabilities",
    ],
    ragTips: [
      "Use for post-retrieval code reasoning",
      "Pair with general LLM for explanations",
    ],
    typicalUseCases: [
      "Code analysis",
      "Bug fixing",
      "Command-line tooling",
    ],
    strengths: [
      "Code understanding",
      "Reasoning efficiency",
    ],
    limitations: [
      "Narrow domain focus",
    ],
  },

  {
    id: "computer-use-preview",
    name: "Computer Use Preview",
    provider: "OpenAI",
    family: "Agents",
    modality: "text+image",
    domainTags: ["agents", "automation", "tools"],
    apiType: "saas",
  
    contextWindow: 128000, // aligned with GPT-4o-class models
    costPer1kTokens: 0.0025, // inherits GPT-4o input pricing (text); actions may add overhead
    latencyMs: 3000, // typical end-to-end (empirical; includes perception + action planning)
  
    license: "proprietary",
    source: "openai-docs",
    url: "https://platform.openai.com/docs/models",
  
    pros: [
      "Designed for tool and computer interaction",
      "Supports agent-style workflows",
    ],
    cons: [
      "Not suitable for pure text generation",
      "Preview model with evolving behaviour",
    ],
    ragTips: [
      "Use as an executor after planning",
      "Pair with planner or reasoning model",
    ],
    typicalUseCases: [
      "UI automation",
      "Computer control agents",
      "Task execution pipelines",
    ],
    strengths: [
      "Tool interaction",
      "Agent workflows",
    ],
    limitations: [
      "Preview stability",
      "Not general-purpose",
    ],
  },

  {
    id: "dall-e-2",
    name: "DALL·E 2",
    provider: "OpenAI",
    family: "DALL·E",
    modality: "image",
    domainTags: ["image-generation", "creative", "vision"],
    apiType: "saas",
    contextWindow: 0, // not applicable (no text context window)
    costPer1kTokens: 0, // pricing is per image, not per token
    latencyMs: 5000, // typical end-to-end image generation (empirical)
    license: "proprietary",
    source: "openai-docs",
    url: "https://platform.openai.com/docs/models",
  
    pros: [
      "Good baseline image generation",
      "Cheaper/simpler than newer image models in many setups",
    ],
    cons: [
      "Lower image quality vs newer models",
      "Weaker prompt fidelity for complex scenes",
    ],
    ragTips: [
      "RAG usually not needed; instead retrieve prompt templates/styles",
      "Store good prompts as reusable snippets",
    ],
    typicalUseCases: [
      "Basic image generation",
      "Simple marketing visuals",
      "Concept sketches",
    ],
    strengths: [
      "Simplicity",
      "Stable baseline",
    ],
    limitations: [
      "Less detailed outputs",
      "Harder complex compositions",
    ],
  },
  
  {
    id: "dall-e-3",
    name: "DALL·E 3",
    provider: "OpenAI",
    family: "DALL·E",
    modality: "image",
    domainTags: ["image-generation", "creative", "vision"],
    apiType: "saas",
    contextWindow: 0, // not applicable (no text context window)
    costPer1kTokens: 0, // pricing is per image, not per token
    latencyMs: 7000, // typical end-to-end image generation (empirical)
    license: "proprietary",
    source: "openai-docs",
    url: "https://platform.openai.com/docs/models",
  
    pros: [
      "Higher quality images than DALL·E 2",
      "Better prompt adherence and composition",
    ],
    cons: [
      "Can be slower than older image models",
      "Not designed for text-only tasks",
    ],
    ragTips: [
      "Retrieve style guides/brand constraints and inject into prompt",
      "Use negative constraints explicitly when needed",
    ],
    typicalUseCases: [
      "High-quality creative generation",
      "Product mockups",
      "Campaign visuals",
    ],
    strengths: [
      "Prompt fidelity",
      "Visual quality",
    ],
    limitations: [
      "Image-only (not a text reasoning model)",
    ],
  },
  
  {
    id: "davinci-002",
    name: "davinci-002",
    provider: "OpenAI",
    family: "GPT-3.5-era",
    modality: "text",
    domainTags: ["legacy", "general", "text-generation"],
    apiType: "saas",
    contextWindow: 4096,
    costPer1kTokens: 0.002,
    latencyMs: 1500, // typical end-to-end
    license: "proprietary",
    source: "openai-docs",
    url: "https://platform.openai.com/docs/models",
  
    pros: [
      "Legacy-compatible text generation",
      "Useful where older prompts/behaviour are expected",
    ],
    cons: [
      "Weaker than modern GPT-4 class models",
      "Not multimodal",
    ],
    ragTips: [
      "Use retrieval for factual grounding",
      "Keep prompts short and explicit",
    ],
    typicalUseCases: [
      "Legacy systems",
      "Simple completions",
      "Basic rewriting",
    ],
    strengths: [
      "Compatibility",
    ],
    limitations: [
      "Lower reasoning quality than modern models",
    ],
  },
  
  {
    id: "gpt-3.5-turbo-16k-0613",
    name: "GPT-3.5 Turbo 16K (0613)",
    provider: "OpenAI",
    family: "GPT-3.5",
    modality: "text",
    domainTags: ["legacy", "general", "chat"],
    apiType: "saas",
    contextWindow: 16384,
    costPer1kTokens: 0.003,
    latencyMs: 1200, //end to end
    license: "proprietary",
    source: "openai-docs",
    url: "https://platform.openai.com/docs/models",
  
    pros: [
      "Cheaper than GPT-4 class models",
      "Larger context than standard GPT-3.5",
    ],
    cons: [
      "Legacy model",
      "Weaker reasoning than GPT-4+ models",
    ],
    ragTips: [
      "Use chunking for long documents",
      "Provide explicit instructions to reduce hallucinations",
    ],
    typicalUseCases: [
      "Cheap chat systems",
      "Lightweight RAG",
      "Summarisation",
    ],
    strengths: [
      "Cost efficiency",
      "Longer context (for GPT-3.5)",
    ],
    limitations: [
      "Lower reasoning quality",
      "Being phased out in favor of newer models",
    ],
  },
  
  {
    id: "gpt-3.5-turbo-instruct",
    name: "GPT-3.5 Turbo Instruct",
    provider: "OpenAI",
    family: "GPT-3.5",
    modality: "text",
    domainTags: ["legacy", "instruction-following", "text"],
    apiType: "saas",
    contextWindow: 4096,
    costPer1kTokens: 0.0015,
    latencyMs: 1100, //end to end 
    license: "proprietary",
    source: "openai-docs",
    url: "https://platform.openai.com/docs/models",
  
    pros: [
      "Instruction-style prompting",
      "Simple completion-based workflows",
    ],
    cons: [
      "Only compatible with legacy completions",
      "Inferior to modern chat models",
    ],
    ragTips: [
      "Keep prompts short and explicit",
      "Avoid multi-step reasoning chains",
    ],
    typicalUseCases: [
      "Legacy instruction pipelines",
      "Basic text transformation",
    ],
    strengths: [
      "Simplicity",
      "Predictable completions",
    ],
    limitations: [
      "Not chat-native",
      "Lower reasoning capability",
    ],
  },
  
  {
    id: "gpt-3.5-turbo-0125",
    name: "GPT-3.5 Turbo",
    provider: "OpenAI",
    family: "GPT-3.5",
    modality: "text",
    domainTags: ["legacy", "general", "chat"],
    apiType: "saas",
    contextWindow: 16385,
    costPer1kTokens: 0.0005,
    latencyMs: 1150, // end-to-end
    license: "proprietary",
    source: "openai-docs",
    url: "https://platform.openai.com/docs/models",
  
    pros: [
      "Cheap chat model",
      "Widely supported in older systems",
    ],
    cons: [
      "Legacy",
      "Much weaker than GPT-4+ models",
    ],
    ragTips: [
      "Use retrieval aggressively for factual accuracy",
      "Avoid complex reasoning tasks",
    ],
    typicalUseCases: [
      "Legacy chatbots",
      "Simple Q&A",
    ],
    strengths: [
      "Low cost",
    ],
    limitations: [
      "Hallucinations",
      "Short context window",
    ],
  },

  {
    id: "gpt-4-turbo-preview",
    name: "GPT-4 Turbo Preview",
    provider: "OpenAI",
    family: "GPT-4",
    modality: "text+image",
    domainTags: ["general", "analysis", "preview"],
    apiType: "saas",
    contextWindow: 128000,
    costPer1kTokens: 0.01,
    latencyMs: 2000, // end-to-end
    license: "proprietary",
    source: "openai-docs",
    url: "https://platform.openai.com/docs/models",
  
    pros: [
      "Cheaper than original GPT-4",
      "Large context window",
      "Good reasoning for complex tasks",
    ],
    cons: [
      "Preview model (less stable)",
      "Superseded by newer GPT-4.x models",
    ],
    ragTips: [
      "Use for long-document RAG",
      "Provide explicit system instructions",
    ],
    typicalUseCases: [
      "RAG systems",
      "Analysis-heavy workflows",
      "Prototyping advanced assistants",
    ],
    strengths: [
      "Long context",
      "Strong reasoning",
    ],
    limitations: [
      "Preview stability",
    ],
  },

  {
    id: "gpt-4-turbo",
    name: "GPT-4 Turbo",
    provider: "OpenAI",
    family: "GPT-4",
    modality: "text+image",
    domainTags: ["general", "analysis"],
    apiType: "saas",
    contextWindow: 128000,
    costPer1kTokens: 0.01,
    latencyMs: 2000, // end-to-end
    license: "proprietary",
    source: "openai-docs",
    url: "https://platform.openai.com/docs/models",
  
    pros: [
      "High intelligence",
      "Cheaper than GPT-4 classic",
      "Stable production model",
    ],
    cons: [
      "Slower than GPT-4o / GPT-4.1 mini",
      "More expensive than mini models",
    ],
    ragTips: [
      "Use metadata filtering for large corpora",
      "Chunk documents conservatively",
    ],
    typicalUseCases: [
      "Enterprise assistants",
      "Decision support",
      "Complex analysis",
    ],
    strengths: [
      "Reasoning quality",
      "Reliability",
    ],
    limitations: [
      "Cost at scale",
    ],
  },

  {
    id: "gpt-4.1-mini",
    name: "GPT-4.1 mini",
    provider: "OpenAI",
    family: "GPT-4.1",
    modality: "text+image",
    domainTags: ["general", "analysis", "fast"],
    apiType: "saas",
    contextWindow: 128000,
    costPer1kTokens: 0.002,
    latencyMs: 1800, //end-to-end
    license: "proprietary",
    source: "openai-docs",
    url: "https://platform.openai.com/docs/models",
  
    pros: [
      "Much faster than GPT-4 Turbo",
      "Strong reasoning for its size",
      "Cost-efficient GPT-4-class model",
    ],
    cons: [
      "Weaker than full GPT-4.1",
      "Not ideal for extremely complex reasoning",
    ],
    ragTips: [
      "Excellent for retrieval + synthesis",
      "Use reranking for high precision",
    ],
    typicalUseCases: [
      "Fast RAG pipelines",
      "Real-time assistants",
      "Cost-sensitive analysis",
    ],
    strengths: [
      "Speed",
      "Cost-performance balance",
    ],
    limitations: [
      "Reduced depth vs full GPT-4.1",
    ],
  },

  {
    id: "gpt-4.1-nano",
    name: "GPT-4.1 nano",
    provider: "OpenAI",
    family: "GPT-4.1",
    modality: "text+image",
    domainTags: ["general", "tools", "vision"],
    apiType: "saas",
    contextWindow: 1047576,
    costPer1kTokens: 0.0001,
    latencyMs: 1500, //end to end 
    license: "proprietary",
    source: "openai-docs",
    url: "https://platform.openai.com/docs/models/gpt-4.1-nano",

    pros: [
      "Very fast",
      "Very cost-efficient",
      "1M context window",
      "Good instruction following and tool calling",
    ],
    cons: [
      "Lower ceiling than larger GPT models",
      "No audio support",
    ],
    ragTips: [
      "Use for fast retrieval+answer loops",
      "Prefer metadata filters to keep context focused",
    ],
    typicalUseCases: [
      "Tool calling",
      "High-throughput RAG",
      "Extraction and classification",
    ],
    strengths: [
      "Speed",
      "Cost efficiency",
      "Long context",
    ],
    limitations: [
      "Not ideal for hardest reasoning tasks",
    ],
  },

  {
    id: "gpt-4",
    name: "GPT-4",
    provider: "OpenAI",
    family: "GPT-4",
    modality: "text+image",
    domainTags: ["general", "analysis", "legacy"],
    apiType: "saas",
    contextWindow: 8192, 
    costPer1kTokens: 0.03,
    latencyMs: 3000, //end-to-end
    license: "proprietary",
    source: "openai-docs",
    url: "https://platform.openai.com/docs/models/gpt-4",

    pros: [
      "High intelligence (legacy GPT-4 line)",
      "Strong general capability",
    ],
    cons: [
      "Legacy/older model family compared to newer lines",
      "Likely slower and more expensive than newer small models",
    ],
    ragTips: [
      "Use hybrid retrieval and keep prompts structured",
    ],
    typicalUseCases: [
      "Complex assistants",
      "Analysis-heavy tasks",
    ],
    strengths: [
      "Reasoning quality",
      "Instruction following",
    ],
    limitations: [
      "Not optimized for cost/latency at scale",
    ],
  },

  {
    id: "gpt-4o-audio-preview",
    name: "GPT-4o Audio (preview)",
    provider: "OpenAI",
    family: "GPT-4o",
    modality: "text+image+audio",
    domainTags: ["general", "audio", "realtime"],
    apiType: "saas",
    contextWindow: 128000,
    costPer1kTokens: 0.0025,
    latencyMs: 350, // typical first audio response (near real-time, empirical)
    license: "proprietary",
    source: "openai-docs",
    url: "https://platform.openai.com/docs/models/gpt-4o-audio-preview",

    pros: [
      "Audio input/output capable",
      "Good for voice agents and realtime experiences",
      "Multimodal (text/image/audio)",
    ],
    cons: [
      "Preview model (may change)",
      "Audio adds complexity + cost",
    ],
    ragTips: [
      "For voice agents: retrieve first, then generate short spoken answers",
      "Keep spoken responses concise; stream when possible",
    ],
    typicalUseCases: [
      "Voice assistants",
      "Realtime audio agents",
      "Call center copilots",
    ],
    strengths: [
      "Speech interaction",
      "Realtime UX",
    ],
    limitations: [
      "Preview stability/behavior may shift",
    ],
  },

  {
    id: "gpt-4o-mini-search-preview",
    name: "GPT-4o Mini Search Preview",
    provider: "OpenAI",
    family: "GPT-4o",
    modality: "text+tool",
    domainTags: ["search", "agents", "web"],
    apiType: "saas",
    contextWindow: 128000,
    costPer1kTokens: 0.00015,
    latencyMs: 1100, //end to end 
    license: "proprietary",
    source: "openai-docs",
    url: "https://platform.openai.com/docs/models",
  
    pros: [
      "Integrated web search capability",
      "Fast and cost-efficient",
      "Good for agent-style workflows",
    ],
    cons: [
      "Preview model (may change)",
      "Search results depend on external sources",
    ],
    ragTips: [
      "Use when fresh web data is required",
      "Combine with local RAG for grounding",
    ],
    typicalUseCases: [
      "Web search agents",
      "Research assistants",
      "Live information retrieval",
    ],
    strengths: [
      "Fresh information access",
      "Agent compatibility",
    ],
    limitations: [
      "Preview stability",
      "Less control over retrieved sources",
    ],
  }, 

  {
    id: "gpt-audio-mini",
    name: "GPT Audio Mini",
    provider: "OpenAI",
    family: "Audio",
    modality: "audio",
    domainTags: ["audio", "speech"],
    apiType: "saas",
    contextWindow: 16000,
    costPer1kTokens: 0.0006,
    latencyMs: 1500,
    license: "proprietary",
    source: "openai-docs",
    url: "https://platform.openai.com/docs/models",
  
    pros: [
      "Supports audio input and output",
      "Lightweight compared to full audio-capable models",
    ],
    cons: [
      "Not designed for deep reasoning",
      "Audio pricing differs from token-based models",
    ],
    ragTips: [
      "Retrieve text first, then convert to audio",
      "Keep spoken responses concise",
    ],
    typicalUseCases: [
      "Voice interfaces",
      "Speech assistants",
      "Audio summarisation",
    ],
    strengths: [
      "Speech interaction",
      "Low overhead",
    ],
    limitations: [
      "Limited reasoning depth",
      "Audio-only focus",
    ],
  },
  
  {
    id: "gpt-realtime-mini",
    name: "GPT Realtime Mini",
    provider: "OpenAI",
    family: "Realtime",
    modality: "audio+realtime",
    domainTags: ["realtime", "audio", "agents"],
    apiType: "saas",
    contextWindow: 128000,
    costPer1kTokens: 0.00015,
    latencyMs: 900, // designed for low-latency streaming; end to end 
    license: "proprietary",
    source: "openai-docs",
    url: "https://platform.openai.com/docs/models",
  
    pros: [
      "Low-latency realtime interaction",
      "Supports streaming audio input/output",
      "Ideal for conversational agents",
    ],
    cons: [
      "More complex integration",
      "Preview / evolving API",
    ],
    ragTips: [
      "Perform retrieval before starting realtime session",
      "Use short, incremental responses",
    ],
    typicalUseCases: [
      "Realtime voice assistants",
      "Live conversational agents",
      "Call-centre copilots",
    ],
    strengths: [
      "Responsiveness",
      "Natural conversational flow",
    ],
    limitations: [
      "Session-based complexity",
      "Not suitable for long-form reasoning",
    ],
  },
  {
    id: "gpt-4o-mini-transcribe",
    name: "GPT-4o Mini Transcribe",
    provider: "OpenAI",
    family: "GPT-4o",
    modality: "audio->text",
    domainTags: ["audio", "speech-to-text", "transcription"],
    apiType: "saas",
    contextWindow: 16000,
    costPer1kTokens: 0, // audio is priced by time/usage, not per 1k tokens
    latencyMs: 0, //to do 
    license: "proprietary",
    source: "openai-docs",
    url: "https://platform.openai.com/docs/models",
  
    pros: [
      "Speech-to-text powered by GPT-4o mini",
      "Good accuracy for transcription",
      "Useful for voice workflows + logging",
    ],
    cons: [
      "Latency depends on audio length and mode",
      "Not intended for general text reasoning",
    ],
    ragTips: [
      "Transcribe first, then run RAG over the transcript",
      "Store timestamps/segments as metadata for retrieval",
    ],
    typicalUseCases: [
      "Meeting transcription",
      "Voice note transcription",
      "Call-center logs",
    ],
    strengths: [
      "Audio understanding",
      "Fast transcription workflows",
    ],
    limitations: [
      "Audio pricing model differs from token pricing",
    ],
  },
  
  {
    id: "gpt-4o-mini-tts",
    name: "GPT-4o Mini TTS",
    provider: "OpenAI",
    family: "GPT-4o",
    modality: "text->audio",
    domainTags: ["audio", "text-to-speech", "tts"],
    apiType: "saas",
    contextWindow: 0, // not token context-window–driven like text LLMs
    costPer1kTokens: 0, // audio is priced by time/usage, not per 1k tokens
    latencyMs: 0, //to do 
    license: "proprietary",
    source: "openai-docs",
    url: "https://platform.openai.com/docs/models",
  
    pros: [
      "Text-to-speech powered by GPT-4o mini",
      "Good for lightweight voice apps",
    ],
    cons: [
      "Not a general chat model (TTS-focused)",
      "Latency depends on audio generation settings",
    ],
    ragTips: [
      "Generate text answer with a text model first, then synthesize",
      "Keep audio responses concise for best UX",
    ],
    typicalUseCases: [
      "Voice assistants (output)",
      "Accessibility narration",
      "Audio notifications",
    ],
    strengths: [
      "Speech output",
      "Low overhead voice output",
    ],
    limitations: [
      "TTS-only focus",
    ],
  },
  
  {
    id: "gpt-4o-realtime",
    name: "GPT-4o Realtime",
    provider: "OpenAI",
    family: "GPT-4o",
    modality: "audio+realtime",
    domainTags: ["realtime", "audio", "streaming", "agents"],
    apiType: "saas",
    contextWindow: 32000, // realtime session model
    costPer1kTokens: 0, // realtime usage is session/stream based, not per 1k tokens
    latencyMs: 800, // designed for low-latency; exact ms not published
    license: "proprietary",
    source: "openai-docs",
    url: "https://platform.openai.com/docs/models",
  
    pros: [
      "Realtime text + audio inputs and outputs",
      "Designed for low-latency conversational experiences",
      "Works well for live assistants / voice agents",
    ],
    cons: [
      "More complex integration (sessions, streaming)",
      "Harder to reproduce deterministically than standard requests",
    ],
    ragTips: [
      "Do retrieval before starting a realtime exchange when possible",
      "Inject short grounded facts during the session (don’t dump long docs)",
    ],
    typicalUseCases: [
      "Realtime voice agents",
      "Live copilots",
      "Interactive assistants",
    ],
    strengths: [
      "Responsiveness",
      "Natural voice conversation",
    ],
    limitations: [
      "Session complexity",
      "Not ideal for long-form deep analysis in one turn",
    ],
  },

  {
    id: "gpt-4o-search-preview",
    name: "GPT-4o Search Preview",
    provider: "OpenAI",
    family: "GPT-4o",
    modality: "text+tool",
    domainTags: ["search", "web", "agents"],
    apiType: "saas",
    contextWindow: 128000,
    costPer1kTokens: 0.00025,
    latencyMs: 0, // to do 
    license: "proprietary",
    source: "openai-docs",
    url: "https://platform.openai.com/docs/models",
  
    pros: [
      "Designed for web search in Chat Completions",
      "Good for agentic workflows that need live information",
    ],
    cons: [
      "Tooling/search adds variability in latency and cost",
      "Not ideal if you need fully offline / deterministic responses",
    ],
    ragTips: [
      "Use search to fetch fresh sources, then summarize with citations",
      "Cache search results for repeated queries",
    ],
    typicalUseCases: [
      "Web search",
      "Research assistants",
      "Fresh-data Q&A",
    ],
    strengths: [
      "Up-to-date retrieval via web search",
      "Good for agents",
    ],
    limitations: [
      "Depends on network/tools",
      "Harder to predict latency/cost",
    ],
  },
  
  {
    id: "gpt-4o-transcribe-diarize",
    name: "GPT-4o Transcribe Diarize",
    provider: "OpenAI",
    family: "GPT-4o",
    modality: "audio->text",
    domainTags: ["audio", "transcription", "diarization", "speech-to-text"],
    apiType: "saas",
    contextWindow: 16000,
    costPer1kTokens: 0.00025,
    latencyMs: 0, // to do 
    license: "proprietary",
    source: "openai-docs",
    url: "https://platform.openai.com/docs/models",
  
    pros: [
      "Adds speaker diarization (who spoke when)",
      "Great for meetings/interviews with multiple speakers",
    ],
    cons: [
      "Diarization can reduce speed vs plain transcription",
      "Quality depends on audio clarity and overlap",
    ],
    ragTips: [
      "Store per-speaker segments with timestamps for retrieval",
      "Chunk transcript by speaker turns for better RAG grounding",
    ],
    typicalUseCases: [
      "Meeting transcription with speakers",
      "Podcast/interview transcription",
      "Call analytics",
    ],
    strengths: [
      "Speaker separation",
      "Structured transcripts",
    ],
    limitations: [
      "More compute than plain STT",
    ],
  },
  
  {
    id: "gpt-4o-transcribe",
    name: "GPT-4o Transcribe",
    provider: "OpenAI",
    family: "GPT-4o",
    modality: "audio->text",
    domainTags: ["audio", "speech-to-text", "transcription"],
    apiType: "saas",
    contextWindow: 16000, 
    costPer1kTokens: 0.00025,
    latencyMs: 0, //to do 
    license: "proprietary",
    source: "openai-docs",
    url: "https://platform.openai.com/docs/models",
  
    pros: [
      "Speech-to-text model powered by GPT-4o",
      "Good general transcription quality",
    ],
    cons: [
      "Latency depends on audio length and processing mode",
      "Not meant for general text reasoning tasks",
    ],
    ragTips: [
      "Transcribe -> clean -> index transcript for retrieval",
      "Persist timestamps for playback + grounded quoting",
    ],
    typicalUseCases: [
      "Transcription",
      "Voice notes",
      "Audio logs",
    ],
    strengths: [
      "Audio understanding",
      "Accurate STT",
    ],
    limitations: [
      "Audio-specific pricing/latency behavior",
    ],
  },  
  {
    id: "gpt-5-chat-latest",
    name: "GPT-5 Chat",
    provider: "OpenAI",
    family: "GPT-5",
    modality: "text+image",
    domainTags: ["general", "reasoning", "chat"],
    apiType: "saas",
    contextWindow: 128000,
    costPer1kTokens: 0.00125,
    latencyMs:  1400, //end to end 
    license: "proprietary",
    source: "openai-docs",
    url: "https://platform.openai.com/docs/models",
  
    pros: [
      "Highest general intelligence model",
      "Supports reasoning tokens",
      "Strong multimodal understanding",
    ],
    cons: [
      "Most expensive GPT model",
      "Overkill for simple tasks",
    ],
    ragTips: [
      "Use with high-quality retrieval to reduce output tokens",
      "Enable streaming for perceived latency improvements",
    ],
    typicalUseCases: [
      "Complex reasoning",
      "Decision support",
      "Advanced RAG systems",
    ],
    strengths: [
      "Deep reasoning",
      "Instruction following",
    ],
    limitations: [
      "Cost at scale",
      "Latency variability",
    ],
  },
  {
    id: "gpt-5-codex",
    name: "GPT-5 Codex",
    provider: "OpenAI",
    family: "GPT-5",
    modality: "text+image",
    domainTags: ["coding", "agents", "reasoning"],
    apiType: "saas",
    contextWindow: 400000,
    costPer1kTokens: 0.00125,
    latencyMs: 1800, //end to end 
    license: "proprietary",
    source: "openai-docs",
    url: "https://platform.openai.com/docs/models",
  
    pros: [
      "Optimized for agentic coding",
      "Huge context window (400k)",
      "Strong reasoning tokens support",
    ],
    cons: [
      "High cost for long outputs",
      "Not optimized for casual chat",
    ],
    ragTips: [
      "Store full repositories without chunking",
      "Use tool calls for repo navigation",
    ],
    typicalUseCases: [
      "Autonomous coding agents",
      "Large codebase analysis",
      "Refactoring at scale",
    ],
    strengths: [
      "Long-context reasoning",
      "Code understanding",
    ],
    limitations: [
      "Cost",
      "Latency for very large prompts",
    ],
  },
  {
    id: "gpt-5-mini",
    name: "GPT-5 Mini",
    provider: "OpenAI",
    family: "GPT-5",
    modality: "text+image",
    domainTags: ["general", "fast", "cost-efficient"],
    apiType: "saas",
    contextWindow: 400000,
    costPer1kTokens: 0.00025,
    latencyMs: 1000, // end to end 
    license: "proprietary",
    source: "openai-docs",
    url: "https://platform.openai.com/docs/models",
  
    pros: [
      "Much cheaper than GPT-5 Chat",
      "Large 400k context window",
      "Fast for well-defined tasks",
    ],
    cons: [
      "Lower reasoning depth than full GPT-5",
      "Less robust for ambiguous prompts",
    ],
    ragTips: [
      "Best used after aggressive retrieval filtering",
      "Ideal for summarization and extraction",
    ],
    typicalUseCases: [
      "Classification",
      "Summarisation",
      "High-throughput RAG",
    ],
    strengths: [
      "Cost efficiency",
      "Speed",
    ],
    limitations: [
      "Reduced reasoning power",
    ],
  },

  {
    id: "gpt-5-nano",
    name: "GPT-5 Nano",
    provider: "OpenAI",
    family: "GPT-5",
    modality: "text+image",
    domainTags: ["fast", "cost-efficient", "general"],
    apiType: "saas",
    contextWindow: 400000,
    costPer1kTokens: 0.00005,
    latencyMs: 750, // end to end 
    license: "proprietary",
    source: "openai-docs",
    url: "https://platform.openai.com/docs/models",
  
    pros: [
      "Fastest GPT-5 variant",
      "Most cost-efficient GPT-5 model",
    ],
    cons: [
      "Lower reasoning depth than GPT-5 Pro",
    ],
    ragTips: [
      "Use for high-throughput pipelines",
      "Pair with strong retrieval filtering",
    ],
    typicalUseCases: [
      "Classification",
      "Summarisation",
      "Simple RAG",
    ],
    strengths: [
      "Speed",
      "Low cost",
    ],
    limitations: [
      "Reduced reasoning capability",
    ],
  },
  {
    id: "gpt-5-pro",
    name: "GPT-5 Pro",
    provider: "OpenAI",
    family: "GPT-5",
    modality: "text+image",
    domainTags: ["reasoning", "precision", "agents"],
    apiType: "saas",
    contextWindow: 400000,
    costPer1kTokens: 0.0015,
    latencyMs: 2500, // end to end 
    license: "proprietary",
    source: "openai-docs",
    url: "https://platform.openai.com/docs/models",
  
    pros: [
      "Smarter and more precise than base GPT-5",
      "Strong reasoning performance",
    ],
    cons: [
      "Slower than GPT-5 Nano",
      "Likely higher cost",
    ],
    ragTips: [
      "Use for complex multi-step reasoning",
      "Ideal for agent decision layers",
    ],
    typicalUseCases: [
      "Complex reasoning",
      "Planning and agents",
      "Decision support",
    ],
    strengths: [
      "Precision",
      "Reasoning depth",
    ],
    limitations: [
      "Speed",
      "Cost at scale",
    ],
  },
  {
    id: "gpt-5.1-chat-latest",
    name: "GPT-5.1 Chat",
    provider: "OpenAI",
    family: "GPT-5.1",
    modality: "text+image",
    domainTags: ["general", "chat", "reasoning"],
    apiType: "saas",
    contextWindow: 128000, 
    costPer1kTokens: 0.000125, 
    latencyMs: 1400, // end to end 
    license: "proprietary",
    source: "openai-docs",
    url: "https://platform.openai.com/docs/models",
  
    pros: [
      "Default GPT-5.1 model used in ChatGPT",
      "Balanced intelligence and speed",
    ],
    cons: [
      "Less specialized than Pro variants",
    ],
    ragTips: [
      "Good default generator after retrieval",
      "Use system prompts for consistency",
    ],
    typicalUseCases: [
      "General chat",
      "Assistant workflows",
      "RAG generation",
    ],
    strengths: [
      "Balanced performance",
      "Reliability",
    ],
    limitations: [
      "Not the fastest",
      "Not the strongest reasoner",
    ],
  },

  {
    id: "gpt-5.1-codex-max",
    name: "GPT-5.1 Codex Max",
    provider: "OpenAI",
    family: "GPT-5.1 Codex",
    modality: "text+image",
    domainTags: ["coding", "agents", "long-horizon"],
    apiType: "saas",
    contextWindow: 400000,
    costPer1kTokens: 0.000125,
    latencyMs: 2700, // end to end 
    license: "proprietary",
    source: "openai-docs",
    url: "https://platform.openai.com/docs/models",
  
    pros: [
      "Most intelligent Codex model",
      "Optimized for long-horizon, agentic coding",
    ],
    cons: [
      "Likely higher cost",
      "Slower than mini variants",
    ],
    ragTips: [
      "Use for agent planning and execution",
      "Pair with tool-use and memory systems",
    ],
    typicalUseCases: [
      "Autonomous coding agents",
      "Large refactors",
      "Multi-step software planning",
    ],
    strengths: [
      "Reasoning depth",
      "Long-horizon planning",
    ],
    limitations: [
      "Cost",
      "Latency for simple tasks",
    ],
  },

  {
    id: "gpt-5.1-codex-mini",
    name: "GPT-5.1 Codex Mini",
    provider: "OpenAI",
    family: "GPT-5.1 Codex",
    modality: "text+image",
    domainTags: ["coding", "cost-efficient"],
    apiType: "saas",
    contextWindow: 400000,
    costPer1kTokens: 0.000025,
    latencyMs: 1500, // end to end 
    license: "proprietary",
    source: "openai-docs",
    url: "https://platform.openai.com/docs/models",
  
    pros: [
      "More cost-effective than Codex Max",
      "Good balance of speed and reasoning",
    ],
    cons: [
      "Less capable than Codex Max",
    ],
    ragTips: [
      "Use for scoped coding tasks",
      "Good fit for IDE copilots",
    ],
    typicalUseCases: [
      "Code generation",
      "Bug fixes",
      "Incremental refactors",
    ],
    strengths: [
      "Efficiency",
      "Lower cost",
    ],
    limitations: [
      "Reduced reasoning depth",
    ],
  },

  {
    id: "gpt-5.1-codex",
    name: "GPT-5.1 Codex",
    provider: "OpenAI",
    family: "GPT-5.1 Codex",
    modality: "text+image",
    domainTags: ["coding", "agents"],
    apiType: "saas",
    contextWindow: 400000,
    costPer1kTokens: 0.000125,
    latencyMs: 1800, //end to end 
    license: "proprietary",
    source: "openai-docs",
    url: "https://platform.openai.com/docs/models",
  
    pros: [
      "Optimized for agentic coding",
      "Stronger than general chat models for code",
    ],
    cons: [
      "Not as powerful as Codex Max",
    ],
    ragTips: [
      "Use structured prompts for tool calls",
      "Works well with execution feedback loops",
    ],
    typicalUseCases: [
      "Agentic coding",
      "Tool-using developers",
      "Automation scripts",
    ],
    strengths: [
      "Coding accuracy",
      "Tool integration",
    ],
    limitations: [
      "General reasoning weaker than Pro chat models",
    ],
  },

  {
    id: "gpt-5.1",
    name: "GPT-5.1",
    provider: "OpenAI",
    family: "GPT-5",
    modality: "text+image",
    domainTags: ["coding", "agents", "reasoning"],
    apiType: "saas",
    contextWindow: 400000,
    costPer1kTokens: 0.000125, 
    latencyMs: 2100,// end to end 
    license: "proprietary",
    source: "openai-docs",
    url: "https://platform.openai.com/docs/models",
  
    pros: [
      "Best model for coding and agentic tasks",
      "Configurable reasoning effort",
    ],
    cons: [
      "Higher cost than mini variants",
    ],
    ragTips: [
      "Use configurable reasoning for complex pipelines",
      "Best paired with tool calling and agents",
    ],
    typicalUseCases: [
      "Agentic workflows",
      "Complex coding tasks",
      "Multi-step reasoning",
    ],
    strengths: [
      "Reasoning control",
      "Coding intelligence",
    ],
    limitations: [
      "Overkill for simple tasks",
    ],
  },

  {
    id: "gpt-5.2-chat-latest",
    name: "GPT-5.2 Chat",
    provider: "OpenAI",
    family: "GPT-5.2",
    modality: "text+image",
    domainTags: ["general", "chat"],
    apiType: "saas",
    contextWindow: 128000,
    costPer1kTokens: 0.000175,
    latencyMs: 1400, // end to end 
    license: "proprietary",
    source: "openai-docs",
    url: "https://platform.openai.com/docs/models",
  
    pros: [
      "Balanced intelligence and speed",
      "Default ChatGPT experience",
    ],
    cons: [
      "Less precise than Pro variant",
    ],
    ragTips: [
      "Use concise chunks for conversational RAG",
      "Good default retriever + generator model",
    ],
    typicalUseCases: [
      "General chat",
      "Knowledge Q&A",
      "Everyday assistance",
    ],
    strengths: [
      "General-purpose reliability",
    ],
    limitations: [
      "Lower reasoning depth than Pro",
    ],
  },

  {
    id: "gpt-5.2-pro",
    name: "GPT-5.2 Pro",
    provider: "OpenAI",
    family: "GPT-5.2",
    modality: "text+image",
    domainTags: ["reasoning", "precision", "agents"],
    apiType: "saas",
    contextWindow: 400000,
    costPer1kTokens: 0.0021,
    latencyMs: 2600, //end to end 
    license: "proprietary",
    source: "openai-docs",
    url: "https://platform.openai.com/docs/models",
  
    pros: [
      "Smarter and more precise than Chat variant",
      "Strong reasoning capabilities",
    ],
    cons: [
      "Slower than Chat model",
      "Higher cost",
    ],
    ragTips: [
      "Use for high-stakes reasoning",
      "Prefer structured outputs",
    ],
    typicalUseCases: [
      "Decision support",
      "Advanced reasoning",
      "Agent planning",
    ],
    strengths: [
      "Precision",
      "Reasoning depth",
    ],
    limitations: [
      "Latency-sensitive workloads",
    ],
  },
  {
    id: "gpt-5.2",
    name: "GPT-5.2",
    provider: "OpenAI",
    family: "GPT-5.2",
    modality: "text+image",
    domainTags: ["coding", "agents", "reasoning"],
    apiType: "saas",
    contextWindow: 400000,
    costPer1kTokens: 0.000175,
    latencyMs: 2200, // end to end 
    license: "proprietary",
    source: "openai-docs",
    url: "https://platform.openai.com/docs/models",
  
    pros: [
      "Best model for coding and agentic tasks across industries",
    ],
    cons: [
      "Higher cost than mini models",
    ],
    ragTips: [
      "Use for complex multi-step retrieval + reasoning",
      "Prefer structured outputs for tool pipelines",
    ],
    typicalUseCases: [
      "Agentic workflows",
      "Complex coding",
      "High-stakes reasoning",
    ],
    strengths: [
      "Reasoning",
      "Agentic performance",
    ],
    limitations: [
      "Overkill for simple tasks",
    ],
  },
  
  {
    id: "gpt-5",
    name: "GPT-5",
    provider: "OpenAI",
    family: "GPT-5",
    modality: "text+image",
    domainTags: ["coding", "agents", "reasoning"],
    apiType: "saas",
    contextWindow: 400000,
    costPer1kTokens: 0.000125,
    latencyMs: 2200,
    license: "proprietary",
    source: "openai-docs",
    url: "https://platform.openai.com/docs/models",
  
    pros: [
      "Strong intelligent reasoning for coding and agentic tasks",
    ],
    cons: [
      "Older than GPT-5.2",
    ],
    ragTips: [
      "Use retrieval + explicit instructions for best consistency",
      "Great default for general agent workflows",
    ],
    typicalUseCases: [
      "Agentic coding",
      "General reasoning",
      "Complex chat workflows",
    ],
    strengths: [
      "Reasoning",
      "Coding",
    ],
    limitations: [
      "Less capable than GPT-5.2",
    ],
  },
  
  {
    id: "gpt-audio-mini",
    name: "gpt-audio-mini",
    provider: "OpenAI",
    family: "GPT Audio",
    modality: "audio",
    domainTags: ["audio"],
    apiType: "saas",
    contextWindow: 128000,
    costPer1kTokens: 0.00006,
    latencyMs: 1600, //end to end 
    license: "proprietary",
    source: "openai-docs",
    url: "https://platform.openai.com/docs/models",
  
    pros: [
      "Cost-efficient audio model",
    ],
    cons: [
      "Lower quality than full-size audio models",
    ],
    ragTips: [
      "Use for low-cost speech workflows",
      "For higher accuracy, move to larger audio-capable models",
    ],
    typicalUseCases: [
      "Audio input/output",
      "Voice interfaces on a budget",
    ],
    strengths: [
      "Cost efficiency",
      "Speed",
    ],
    limitations: [
      "Not the highest-fidelity audio option",
    ],
  },
  
  {
    id: "gpt-audio",
    name: "GPT Audio",
    provider: "OpenAI",
    family: "GPT Audio",
    modality: "audio",
    domainTags: ["audio", "speech"],
    apiType: "saas",
    contextWindow: 128000,
    costPer1kTokens: 0.000250,
    latencyMs: 2200, //end to end 
    license: "proprietary",
    source: "openai-docs",
    url: "https://platform.openai.com/docs/models",
  
    pros: [
      "Supports audio input and output",
      "Integrated with Chat Completions API",
    ],
    cons: [
      "Not optimized for low-latency realtime use",
    ],
    ragTips: [
      "Use text-based RAG before audio generation",
      "Prefer chunked transcripts for retrieval",
    ],
    typicalUseCases: [
      "Speech interfaces",
      "Voice assistants",
      "Audio transcription + response",
    ],
    strengths: [
      "Audio understanding",
      "Multimodal interaction",
    ],
    limitations: [
      "Higher cost than text-only models",
    ],
  },

  {
    id: "gpt-image-1-mini",
    name: "GPT Image 1 Mini",
    provider: "OpenAI",
    family: "GPT Image",
    modality: "image",
    domainTags: ["image", "generation"],
    apiType: "saas",
    contextWindow: 0,
    costPer1kTokens: 0.0002,
    latencyMs: 3200, // end to end 
    license: "proprietary",
    source: "openai-docs",
    url: "https://platform.openai.com/docs/models",
  
    pros: [
      "Cost-efficient image generation",
      "Good default for simple visuals",
    ],
    cons: [
      "Lower fidelity than full Image 1.5",
    ],
    ragTips: [
      "Use concise prompts with style descriptors",
      "Avoid overly complex scenes",
    ],
    typicalUseCases: [
      "Simple image generation",
      "Thumbnails",
      "UI mockups",
    ],
    strengths: [
      "Cost efficiency",
      "Speed",
    ],
    limitations: [
      "Limited visual complexity",
    ],
  },

  {
    id: "gpt-image-1.5",
    name: "GPT Image 1.5",
    provider: "OpenAI",
    family: "GPT Image",
    modality: "image",
    domainTags: ["image", "generation", "creative"],
    apiType: "saas",
    contextWindow: 0,
    costPer1kTokens: 0.0005,
    latencyMs: 4500, //end to end 
    license: "proprietary",
    source: "openai-docs",
    url: "https://platform.openai.com/docs/models",
  
    pros: [
      "State-of-the-art image generation",
      "High visual fidelity",
    ],
    cons: [
      "More expensive than mini variant",
    ],
    ragTips: [
      "Use detailed prompts with composition guidance",
      "Include style and lighting cues",
    ],
    typicalUseCases: [
      "High-quality image generation",
      "Creative design",
      "Marketing visuals",
    ],
    strengths: [
      "Image quality",
      "Creative control",
    ],
    limitations: [
      "Not optimized for bulk generation",
    ],
  },
  {
    id: "gpt-image-1",
    name: "GPT Image 1",
    provider: "OpenAI",
    family: "GPT Image",
    modality: "image",
    domainTags: ["image", "generation", "legacy"],
    apiType: "saas",
    contextWindow: 0,
    costPer1kTokens: 0.0005,
    latencyMs: 5500, // end to end 
    license: "proprietary",
    source: "openai-docs",
    url: "https://platform.openai.com/docs/models",
  
    pros: [
      "Stable legacy image generation model",
    ],
    cons: [
      "Lower quality than GPT Image 1.5",
      "Superseded by newer models",
    ],
    ragTips: [
      "Prefer newer image models when available",
    ],
    typicalUseCases: [
      "Legacy image generation",
      "Backward compatibility",
    ],
    strengths: [
      "Stability",
    ],
    limitations: [
      "Outdated image quality",
    ],
  },

  {
    id: "gpt-oss-120b",
    name: "GPT-OSS 120B",
    provider: "OpenAI",
    family: "GPT-OSS",
    modality: "text",
    domainTags: ["open-weight", "self-hosted", "research"],
    apiType: "self-hosted",
    contextWindow: 131072,
    costPer1kTokens: 0,
    latencyMs: 4200, // end to end
    license: "open-weight",
    source: "openai-docs",
    url: "https://platform.openai.com/docs/models",
  
    pros: [
      "Most powerful open-weight OpenAI model",
      "Can run on a single H100 GPU",
    ],
    cons: [
      "High infrastructure requirements",
      "Operational complexity",
    ],
    ragTips: [
      "Use quantization for inference",
      "Pair with vector DB and reranking",
    ],
    typicalUseCases: [
      "Research",
      "Private deployments",
      "High-control environments",
    ],
    strengths: [
      "Model control",
      "Open-weight transparency",
    ],
    limitations: [
      "Not managed as SaaS",
    ],
  },
  
  {
    id: "gpt-oss-20b",
    name: "GPT-OSS 20B",
    provider: "OpenAI",
    family: "GPT-OSS",
    modality: "text",
    domainTags: ["open-weight", "low-latency", "self-hosted"],
    apiType: "self-hosted",
    contextWindow: 131072,
    costPer1kTokens: 0,
    latencyMs: 2200, //end to end 
    license: "open-weight",
    source: "openai-docs",
    url: "https://platform.openai.com/docs/models",
  
    pros: [
      "Lower latency than 120B variant",
      "Easier to deploy",
    ],
    cons: [
      "Less capable than 120B model",
    ],
    ragTips: [
      "Ideal for lightweight RAG pipelines",
      "Use aggressive retrieval filtering",
    ],
    typicalUseCases: [
      "Low-latency inference",
      "Edge or constrained deployments",
    ],
    strengths: [
      "Speed",
      "Deployability",
    ],
    limitations: [
      "Reduced reasoning depth",
    ],
  },

  {
    id: "gpt-realtime-mini",
    name: "GPT Realtime Mini",
    provider: "OpenAI",
    family: "GPT Realtime",
    modality: "text+audio+realtime",
    domainTags: ["realtime", "audio", "low-latency"],
    apiType: "saas",
    contextWindow: 32000,
    costPer1kTokens: 0.00006,
    latencyMs: 900,// end to end 
    license: "proprietary",
    source: "openai-docs",
    url: "https://platform.openai.com/docs/models",
  
    pros: [
      "Cost-efficient realtime interactions",
      "Supports realtime text and audio",
    ],
    cons: [
      "Less capable than full GPT Realtime",
    ],
    ragTips: [
      "Use for conversational agents with live feedback",
    ],
    typicalUseCases: [
      "Realtime assistants",
      "Voice-enabled chat",
    ],
    strengths: [
      "Low latency",
      "Realtime responsiveness",
    ],
    limitations: [
      "Reduced reasoning depth",
    ],
  },

  {
    id: "gpt-realtime",
    name: "GPT Realtime",
    provider: "OpenAI",
    family: "GPT Realtime",
    modality: "text+audio+realtime",
    domainTags: ["realtime", "audio", "agents"],
    apiType: "saas",
    contextWindow: 32000,
    costPer1kTokens: 0.0004,
    latencyMs: 800, // end to end 
    license: "proprietary",
    source: "openai-docs",
    url: "https://platform.openai.com/docs/models",
  
    pros: [
      "Full realtime text and audio support",
      "Designed for interactive agents",
    ],
    cons: [
      "Higher cost than mini variant",
    ],
    ragTips: [
      "Stream partial responses for best UX",
    ],
    typicalUseCases: [
      "Realtime voice agents",
      "Live multimodal assistants",
    ],
    strengths: [
      "Realtime multimodality",
      "Strong conversational flow",
    ],
    limitations: [
      "Not optimized for long-form reasoning",
    ],
  },

  {
    id: "o1-mini",
    name: "o1 Mini",
    provider: "OpenAI",
    family: "o1",
    modality: "text",
    domainTags: ["reasoning", "lightweight"],
    apiType: "saas",
    contextWindow: 128000,
    costPer1kTokens: 0.00011,
    latencyMs: 1500, // end to end
    license: "proprietary",
    source: "openai-docs",
    url: "https://platform.openai.com/docs/models",
  
    pros: [
      "Lightweight reasoning model",
      "Lower cost than o1",
    ],
    cons: [
      "Weaker reasoning than full o1",
    ],
    ragTips: [
      "Use for simple chain-of-thought tasks",
    ],
    typicalUseCases: [
      "Basic reasoning",
      "Cost-sensitive logic tasks",
    ],
    strengths: [
      "Efficiency",
      "Speed",
    ],
    limitations: [
      "Limited depth of reasoning",
    ],
  },

  {
    id: "o1-preview",
    name: "o1 Preview",
    provider: "OpenAI",
    family: "o1",
    modality: "text",
    domainTags: ["reasoning", "preview"],
    apiType: "saas",
    contextWindow: 128000,
    costPer1kTokens: 0.0015,
    latencyMs: 2500, // end to end 
    license: "proprietary",
    source: "openai-docs",
    url: "https://platform.openai.com/docs/models",
  
    pros: [
      "Early access to o-series reasoning capabilities",
      "Designed for complex logical tasks",
    ],
    cons: [
      "Preview model",
      "Less stable than later o-series versions",
    ],
    ragTips: [
      "Use for experimentation with reasoning-heavy prompts",
    ],
    typicalUseCases: [
      "Research",
      "Early reasoning evaluation",
    ],
    strengths: [
      "Chain-of-thought style reasoning",
    ],
    limitations: [
      "Not production-optimized",
    ],
  },

  {
    id: "o1-pro",
    name: "o1 Pro",
    provider: "OpenAI",
    family: "o1",
    modality: "text",
    domainTags: ["reasoning", "high-compute"],
    apiType: "saas",
    contextWindow: 200000,
    costPer1kTokens: 0.015,
    latencyMs: 3200, // end to end 
    license: "proprietary",
    source: "openai-docs",
    url: "https://platform.openai.com/docs/models",
  
    pros: [
      "More compute allocated for stronger reasoning",
      "Improved answer quality over o1",
    ],
    cons: [
      "Higher cost than base o1",
    ],
    ragTips: [
      "Best for difficult multi-step reasoning queries",
    ],
    typicalUseCases: [
      "Advanced reasoning tasks",
      "Decision support systems",
    ],
    strengths: [
      "Deeper reasoning",
      "Higher accuracy on complex prompts",
    ],
    limitations: [
      "Slower than lightweight models",
    ],
  },

  {
    id: "o1",
    name: "o1",
    provider: "OpenAI",
    family: "o1",
    modality: "text",
    domainTags: ["reasoning"],
    apiType: "saas",
    contextWindow: 200000,
    costPer1kTokens: 0.0015,
    latencyMs: 2200, // end to end 
    license: "proprietary",
    source: "openai-docs",
    url: "https://platform.openai.com/docs/models",
  
    pros: [
      "Full o-series reasoning model",
      "Strong logical consistency",
    ],
    cons: [
      "Superseded by newer reasoning models",
    ],
    ragTips: [
      "Use structured prompts to guide reasoning",
    ],
    typicalUseCases: [
      "Logic-heavy tasks",
      "Analytical reasoning",
    ],
    strengths: [
      "Reliable multi-step reasoning",
    ],
    limitations: [
      "Not the latest o-series model",
    ],
  },

  {
    id: "o3-deep-research",
    name: "o3 Deep Research",
    provider: "OpenAI",
    family: "o3",
    modality: "text",
    domainTags: ["reasoning", "research", "deep-analysis"],
    apiType: "saas",
    contextWindow: 200000,
    costPer1kTokens: 0.0010,
    latencyMs: 9000, // end to end 
    license: "proprietary",
    source: "openai-docs",
    url: "https://platform.openai.com/docs/models",
  
    pros: [
      "Most powerful deep research model in the o-series",
      "Designed for long-horizon analytical tasks",
    ],
    cons: [
      "Higher latency than standard reasoning models",
      "Not optimized for lightweight tasks",
    ],
    ragTips: [
      "Use with structured research prompts",
      "Chunk large documents to guide reasoning depth",
    ],
    typicalUseCases: [
      "Academic research",
      "Deep investigative analysis",
      "Long-form reasoning tasks",
    ],
    strengths: [
      "Depth of reasoning",
      "Sustained analytical coherence",
    ],
    limitations: [
      "Overkill for simple queries",
    ],
  },

  {
    id: "o3-mini",
    name: "o3 Mini",
    provider: "OpenAI",
    family: "o3",
    modality: "text",
    domainTags: ["reasoning", "lightweight"],
    apiType: "saas",
    contextWindow: 200000,
    costPer1kTokens: 0.0001,
    latencyMs: 2600,  // end to end 
    license: "proprietary",
    source: "openai-docs",
    url: "https://platform.openai.com/docs/models",
  
    pros: [
      "Cost-efficient alternative to o3",
      "Faster responses for reasoning tasks",
    ],
    cons: [
      "Reduced reasoning depth compared to o3 and o3-pro",
    ],
    ragTips: [
      "Best for shallow-to-medium reasoning with retrieval",
    ],
    typicalUseCases: [
      "Everyday reasoning",
      "Agent decision steps",
    ],
    strengths: [
      "Speed",
      "Efficiency",
    ],
    limitations: [
      "Not suitable for deep research workloads",
    ],
  },

  {
    id: "o3-pro",
    name: "o3 Pro",
    provider: "OpenAI",
    family: "o3",
    modality: "text",
    domainTags: ["reasoning", "high-compute"],
    apiType: "saas",
    contextWindow: 200000,
    costPer1kTokens: 0.0020,
    latencyMs: 15000,  // end to end 
    license: "proprietary",
    source: "openai-docs",
    url: "https://platform.openai.com/docs/models",
  
    pros: [
      "More compute than base o3",
      "Improved accuracy and reasoning stability",
    ],
    cons: [
      "Higher cost and latency than o3-mini",
    ],
    ragTips: [
      "Use when correctness matters more than speed",
    ],
    typicalUseCases: [
      "Complex reasoning",
      "Strategic planning",
    ],
    strengths: [
      "Reasoning robustness",
      "Consistency on multi-step tasks",
    ],
    limitations: [
      "Slower response times",
    ],
  },
  {
    id: "o3",
    name: "o3",
    provider: "OpenAI",
    family: "o-series",
    modality: "text",
    domainTags: ["reasoning", "complex-tasks", "legacy"],
    apiType: "saas",
    contextWindow: 200000,
    costPer1kTokens: 0.0002,
    latencyMs: 3500, // end to end 
    license: "proprietary",
    source: "openai-docs",
    url: "https://platform.openai.com/docs/models",
  
    pros: [
      "Strong reasoning model for complex tasks",
      "Foundation of later o-series models",
    ],
    cons: [
      "Superseded by GPT-5 models",
      "Lower efficiency than newer reasoning models",
    ],
    ragTips: [
      "Use only for backward compatibility",
    ],
    typicalUseCases: [
      "Legacy reasoning workloads",
    ],
    strengths: [
      "Multi-step reasoning",
    ],
    limitations: [
      "Outperformed by newer models",
    ],
  },

  {
    id: "o4-mini-deep-research",
    name: "o4 Mini Deep Research",
    provider: "OpenAI",
    family: "o4",
    modality: "text",
    domainTags: ["research", "reasoning", "deep-analysis"],
    apiType: "saas",
    contextWindow: 200000,
    costPer1kTokens: 0.0002,
    latencyMs: 7000, //end to end 
    license: "proprietary",
    source: "openai-docs",
    url: "https://platform.openai.com/docs/models",
  
    pros: [
      "More affordable deep research model",
      "Optimized for analytical workloads",
    ],
    cons: [
      "Less powerful than full o4 or GPT-5 research models",
    ],
    ragTips: [
      "Guide with structured research prompts",
      "Use targeted retrieval to constrain scope",
    ],
    typicalUseCases: [
      "Cost-sensitive research",
      "Analytical reports",
    ],
    strengths: [
      "Reasoning efficiency",
      "Lower cost research",
    ],
    limitations: [
      "Reduced depth compared to top-tier research models",
    ],
  },

  {
    id: "o4-mini",
    name: "o4 Mini",
    provider: "OpenAI",
    family: "o4",
    modality: "text",
    domainTags: ["reasoning", "cost-efficient"],
    apiType: "saas",
    contextWindow: 200000,
    costPer1kTokens: 0.00011,
    latencyMs: 1800, //end to end 
    license: "proprietary",
    source: "openai-docs",
    url: "https://platform.openai.com/docs/models",
  
    pros: [
      "Fast, cost-efficient reasoning model",
      "Good balance between speed and reasoning",
    ],
    cons: [
      "Superseded by GPT-5 mini",
    ],
    ragTips: [
      "Best for short reasoning chains with retrieval",
    ],
    typicalUseCases: [
      "Agent reasoning steps",
      "Decision support",
    ],
    strengths: [
      "Speed",
      "Efficiency",
    ],
    limitations: [
      "Not suitable for deep research tasks",
    ],
  },

  {
    id: "omni-moderation",
    name: "Omni Moderation",
    provider: "OpenAI",
    family: "Omni",
    modality: "text+image",
    domainTags: ["safety", "moderation", "trust"],
    apiType: "saas",
    contextWindow: 0,
    costPer1kTokens: 0,
    latencyMs: 0,
    license: "proprietary",
    source: "openai-docs",
    url: "https://platform.openai.com/docs/models",
  
    pros: [
      "Unified moderation for text and images",
      "Essential for safety-critical systems",
    ],
    cons: [
      "Not a generative model",
      "Used only as a supporting service",
    ],
    ragTips: [
      "Run moderation before generation in pipelines",
    ],
    typicalUseCases: [
      "Content filtering",
      "Safety enforcement",
    ],
    strengths: [
      "Policy coverage",
      "Low operational overhead",
    ],
    limitations: [
      "No generative or reasoning capability",
    ],
  },

  {
    id: "sora-2-pro",
    name: "Sora 2 Pro",
    provider: "OpenAI",
    family: "Sora",
    modality: "video+audio",
    domainTags: ["video", "generation", "creative"],
    apiType: "saas",
    contextWindow: 0,
    costPer1kTokens: 0,
    latencyMs: 0,
    license: "proprietary",
    source: "openai-docs",
    url: "https://platform.openai.com/docs/models",
  
    pros: [
      "Most advanced synced-audio video generation",
      "High temporal and visual fidelity",
    ],
    cons: [
      "High compute cost",
      "Not designed for real-time generation",
    ],
    ragTips: [
      "Use structured prompts with shot-level detail",
    ],
    typicalUseCases: [
      "Cinematic video generation",
      "High-end creative production",
    ],
    strengths: [
      "Video realism",
      "Audio-video alignment",
    ],
    limitations: [
      "Latency",
      "Cost",
    ],
  },

  {
    id: "sora-2",
    name: "Sora 2",
    provider: "OpenAI",
    family: "Sora",
    modality: "video+audio",
    domainTags: ["video", "generation", "creative"],
    apiType: "saas",
    contextWindow: 0,
    costPer1kTokens: 0,
    latencyMs: 0,
    license: "proprietary",
    source: "openai-docs",
    url: "https://platform.openai.com/docs/models",
  
    pros: [
      "Flagship video generation with synced audio",
      "High-quality outputs for creative workflows",
    ],
    cons: [
      "Less powerful than Sora 2 Pro",
    ],
    ragTips: [
      "Use clear scene transitions in prompts",
    ],
    typicalUseCases: [
      "Marketing videos",
      "Storytelling",
    ],
    strengths: [
      "Creative flexibility",
    ],
    limitations: [
      "Not optimized for short-form real-time video",
    ],
  },

  {
    id: "text-embedding-3-large",
    name: "Text Embedding 3 Large",
    provider: "OpenAI",
    family: "Embedding",
    modality: "text",
    domainTags: ["embeddings", "retrieval", "rag"],
    apiType: "saas",
    contextWindow: 0,
    costPer1kTokens: 0,
    latencyMs: 0,
    license: "proprietary",
    source: "openai-docs",
    url: "https://platform.openai.com/docs/models",
  
    pros: [
      "Most capable OpenAI embedding model",
      "High semantic fidelity for retrieval tasks",
    ],
    cons: [
      "Higher cost than small embedding models",
    ],
    ragTips: [
      "Use for primary vector stores",
      "Ideal for high-recall semantic search",
    ],
    typicalUseCases: [
      "RAG pipelines",
      "Semantic search",
      "Document similarity",
    ],
    strengths: [
      "Embedding quality",
      "Robust semantic clustering",
    ],
    limitations: [
      "More expensive than smaller alternatives",
    ],
  },

  {
    id: "text-embedding-3-small",
    name: "Text Embedding 3 Small",
    provider: "OpenAI",
    family: "Embedding",
    modality: "text",
    domainTags: ["embeddings", "retrieval", "rag"],
    apiType: "saas",
    contextWindow: 0,
    costPer1kTokens: 0,
    latencyMs: 0,
    license: "proprietary",
    source: "openai-docs",
    url: "https://platform.openai.com/docs/models",
  
    pros: [
      "Cost-efficient embedding model",
      "Fast inference",
    ],
    cons: [
      "Lower semantic precision than embedding-3-large",
    ],
    ragTips: [
      "Use for lightweight or high-throughput RAG",
    ],
    typicalUseCases: [
      "Cheap semantic search",
      "Edge-scale retrieval",
    ],
    strengths: [
      "Speed",
      "Cost efficiency",
    ],
    limitations: [
      "Lower recall on complex semantic queries",
    ],
  },

  {
    id: "text-embedding-ada-002",
    name: "Text Embedding Ada 002",
    provider: "OpenAI",
    family: "Embedding",
    modality: "text",
    domainTags: ["embeddings", "legacy"],
    apiType: "saas",
    contextWindow: 0,
    costPer1kTokens: 0,
    latencyMs: 0,
    license: "proprietary",
    source: "openai-docs",
    url: "https://platform.openai.com/docs/models",
  
    pros: [
      "Stable legacy embedding model",
      "Widely adopted in older systems",
    ],
    cons: [
      "Inferior to embedding-3 models",
      "Legacy status",
    ],
    ragTips: [
      "Only keep for backward compatibility",
    ],
    typicalUseCases: [
      "Legacy RAG systems",
      "Backward-compatible embeddings",
    ],
    strengths: [
      "Ecosystem maturity",
    ],
    limitations: [
      "Outperformed by newer embedding models",
    ],
  },

  {
    id: "text-moderation",
    name: "Text Moderation",
    provider: "OpenAI",
    family: "Moderation",
    modality: "text",
    domainTags: ["moderation", "safety", "legacy"],
    apiType: "saas",
    contextWindow: 0,
    costPer1kTokens: 0,
    latencyMs: 0,
    license: "proprietary",
    source: "openai-docs",
    url: "https://platform.openai.com/docs/models",
  
    pros: [
      "Simple text-only moderation",
      "Stable legacy behavior",
    ],
    cons: [
      "Superseded by omni-moderation",
      "Text-only",
    ],
    ragTips: [],
    typicalUseCases: [
      "Legacy content moderation pipelines",
    ],
    strengths: [
      "Predictability",
    ],
    limitations: [
      "No multimodal support",
      "Legacy status",
    ],
  },

  {
    id: "text-moderation-stable",
    name: "Text Moderation Stable",
    provider: "OpenAI",
    family: "Moderation",
    modality: "text",
    domainTags: ["moderation", "safety", "legacy"],
    apiType: "saas",
    contextWindow: 0,
    costPer1kTokens: 0,
    latencyMs: 0,
    license: "proprietary",
    source: "openai-docs",
    url: "https://platform.openai.com/docs/models",
  
    pros: [
      "Frozen moderation behavior",
      "Suitable for regulated environments",
    ],
    cons: [
      "Outdated compared to omni-moderation",
    ],
    ragTips: [],
    typicalUseCases: [
      "Compliance-critical moderation",
      "Legacy production systems",
    ],
    strengths: [
      "Behavioral stability",
    ],
    limitations: [
      "No multimodal coverage",
      "Legacy model",
    ],
  },

  {
    id: "tts-1-hd",
    name: "TTS-1 HD",
    provider: "OpenAI",
    family: "TTS",
    modality: "audio",
    domainTags: ["text-to-speech", "audio"],
    apiType: "saas",
    contextWindow: 0,
    costPer1kTokens: 0,
    latencyMs: 0,
    license: "proprietary",
    source: "openai-docs",
    url: "https://platform.openai.com/docs/models",
  
    pros: [
      "High-quality speech synthesis",
      "Natural voice output",
    ],
    cons: [
      "Higher cost than standard TTS",
    ],
    ragTips: [],
    typicalUseCases: [
      "Audiobooks",
      "Narration",
      "High-quality voice assistants",
    ],
    strengths: [
      "Audio quality",
      "Clarity",
    ],
    limitations: [
      "Not realtime-optimized",
    ],
  },

  {
    id: "tts-1",
    name: "TTS-1",
    provider: "OpenAI",
    family: "TTS",
    modality: "audio",
    domainTags: ["text-to-speech", "audio"],
    apiType: "saas",
    contextWindow: 0,
    costPer1kTokens: 0,
    latencyMs: 0,
    license: "proprietary",
    source: "openai-docs",
    url: "https://platform.openai.com/docs/models",
  
    pros: [
      "Low-latency speech synthesis",
      "Cost-efficient compared to HD",
    ],
    cons: [
      "Lower audio fidelity than TTS-1-HD",
    ],
    ragTips: [],
    typicalUseCases: [
      "Realtime voice assistants",
      "System prompts with audio output",
      "Fast narration",
    ],
    strengths: [
      "Speed",
      "Efficiency",
    ],
    limitations: [
      "Not optimized for premium audio quality",
    ],
  },

  {
    id: "whisper",
    name: "Whisper",
    provider: "OpenAI",
    family: "Speech Recognition",
    modality: "audio",
    domainTags: ["speech-to-text", "transcription", "audio"],
    apiType: "saas",
    contextWindow: 0,
    costPer1kTokens: 0,
    latencyMs: 0,
    license: "proprietary",
    source: "openai-docs",
    url: "https://platform.openai.com/docs/models",
  
    pros: [
      "High-quality speech recognition",
      "Multilingual transcription",
    ],
    cons: [
      "Not realtime-optimized compared to GPT Realtime",
    ],
    ragTips: [],
    typicalUseCases: [
      "Audio transcription",
      "Meeting notes",
      "Voice data preprocessing",
    ],
    strengths: [
      "Accuracy",
      "Language coverage",
    ],
    limitations: [
      "Audio input only",
    ],
  },

  {
    id: "llama-3.1-70b",
    name: "LLaMA 3 70B",
    provider: "Meta",
    family: "LLaMA",
    modality: "text",
    domainTags: ["open-source", "research"],
    apiType: "self-hosted",
    contextWindow: 8192,
    costPer1kTokens: 0.0009,
    latencyMs: 4000,  //measured end to end 1000 ms for 1st token
    license: "open",
    source: "meta",
    url: "https://ai.meta.com/llama/",

    pros: ["Fully self-hostable", "No per-token cost", "Strong open-source community"],
    cons: ["High infrastructure cost", "Requires tuning for best performance"],
    ragTips: ["Quantize for inference", "Use vector DB with aggressive filtering"],
    typicalUseCases: ["Private deployments", "Research"],
    strengths: ["Privacy", "Control"],
    limitations: ["Operational complexity"],
  },

  {
    id: "llama-3.3-70b",
    name: "LLaMA 3.3 70B",
    provider: "Meta",
    family: "LLaMA",
    modality: "text",
    domainTags: ["open-source", "instruction-tuned", "research"],
    apiType: "self-hosted",
    contextWindow: 8192,
    costPer1kTokens: 0.0009,
    latencyMs: 4000,
    license: "open",
    source: "meta",
    url: "https://ai.meta.com/llama/",
  
    pros: [
      "Improved instruction-following over LLaMA 3.1",
      "Strong coding and reasoning benchmarks",
      "Fully open-weight",
    ],
    cons: [
      "High compute requirements",
      "Still requires tuning for production",
    ],
    ragTips: [
      "Use vector DB with aggressive chunk filtering",
      "Quantize to 4-bit or 8-bit for inference",
    ],
    typicalUseCases: [
      "Research",
      "Private deployments",
      "Open-source alternatives to GPT-4-class models",
    ],
    strengths: [
      "Instruction following",
      "Code generation",
      "Open deployment",
    ],
    limitations: [
      "Operational complexity",
    ],
  },

  {
    id: "llama-3.1-405b",
    name: "LLaMA 3.1 405B",
    provider: "Meta",
    family: "LLaMA",
    modality: "text",
    domainTags: ["open-source", "research", "large-model"],
    apiType: "self-hosted",
    contextWindow: 8192,
    costPer1kTokens: 0, //to do 
    latencyMs: 0, // to do 
    license: "open",
    source: "meta",
    url: "https://ai.meta.com/llama/",
  
    pros: [
      "Most powerful open-weight LLM from Meta",
      "Competitive with frontier proprietary models",
      "Excellent reasoning and coding performance",
    ],
    cons: [
      "Extremely high infrastructure cost",
      "Requires multi-GPU or H100-class hardware",
    ],
    ragTips: [
      "Mandatory retrieval filtering",
      "Shard across GPUs for inference",
    ],
    typicalUseCases: [
      "Frontier research",
      "Model distillation",
      "High-end private AI platforms",
    ],
    strengths: [
      "Reasoning",
      "Scale",
      "Open weights",
    ],
    limitations: [
      "Not practical for most production teams",
    ],
  },  
//claude ais 
  {
    id: "claude-opus-4-6",
    name: "Claude Opus 4.6",
    provider: "Anthropic",
    family: "Claude",
    modality: "multimodal",
    domainTags: ["reasoning", "agents", "coding", "vision"],
    apiType: "saas",
    contextWindow: 200000, // 1M beta exists; keeping stable default
    costPer1kTokens: 0.005, // $5 / 1M input tokens => $0.005 / 1k
    latencyMs: 0,
    license: "proprietary",
    source: "anthropic-docs",
    url: "https://platform.claude.com/docs/en/about-claude/models/overview",
  
    pros: [
      "Top-tier reasoning + coding performance",
      "Strong agent workflows + tool use",
      "Supports text + image input",
    ],
    cons: [
      "More expensive than Sonnet/Haiku",
      "Output pricing is higher (store separately if you track output cost)",
    ],
    ragTips: [
      "Use long-context for full docs/codebases",
      "Chunk less aggressively than small-context models; prefer semantic sections",
    ],
    typicalUseCases: [
      "Complex RAG and analysis",
      "Autonomous agents and multi-step workflows",
      "High-stakes coding assistance",
    ],
    strengths: ["Reasoning depth", "Coding", "Vision + doc understanding"],
    limitations: ["Proprietary", "Cost for large outputs"],
  },
  
  {
    id: "claude-sonnet-4-6",
    name: "Claude Sonnet 4.6",
    provider: "Anthropic",
    family: "Claude",
    modality: "multimodal",
    domainTags: ["balanced", "agents", "coding", "vision"],
    apiType: "saas",
    contextWindow: 200000, // 1M beta exists
    costPer1kTokens: 0.003, // $3 / 1M input tokens => $0.003 / 1k
    latencyMs: 0,
    license: "proprietary",
    source: "anthropic-docs",
    url: "https://platform.claude.com/docs/en/about-claude/models/overview",
  
    pros: [
      "Best balance of speed and intelligence in Claude lineup",
      "Strong for coding + agentic tool use",
      "Text + image input",
    ],
    cons: [
      "Not the absolute strongest (Opus is higher)",
      "Output pricing still meaningful at scale",
    ],
    ragTips: [
      "Great default for production RAG",
      "Use citations/grounding and keep retrieved context tight but complete",
    ],
    typicalUseCases: [
      "General assistant + chat",
      "Production RAG assistants",
      "Coding copilots",
      "Ops / research workflows",
    ],
    strengths: ["Balanced quality", "Speed", "Tool use", "Vision"],
    limitations: ["Proprietary"],
  },
  
  {
    id: "claude-haiku-4-5",
    name: "Claude Haiku 4.5",
    provider: "Anthropic",
    family: "Claude",
    modality: "multimodal",
    domainTags: ["fast", "cost-efficient", "vision"],
    apiType: "saas",
    contextWindow: 200000,
    costPer1kTokens: 0.001, // $1 / 1M input tokens => $0.001 / 1k
    latencyMs: 0,
    license: "proprietary",
    source: "anthropic-docs",
    url: "https://platform.claude.com/docs/en/about-claude/models/overview",
  
    pros: [
      "Fastest Claude tier",
      "Cost-efficient at scale",
      "Text + image input",
    ],
    cons: [
      "Lower ceiling than Sonnet/Opus on hardest tasks",
    ],
    ragTips: [
      "Use for high-volume RAG Q&A with tight retrieval",
      "Prefer short, high-signal chunks + reranking",
    ],
    typicalUseCases: [
      "Customer support automation",
      "High-throughput summarization",
      "Simple agents and classification",
    ],
    strengths: ["Speed", "Cost efficiency"],
    limitations: ["Not ideal for deepest reasoning"],
  },

  //gemini ais:
  {
    id: "gemini-3.1-pro",
    name: "Gemini 3.1 Pro",
    provider: "Google",
    family: "Gemini 3",
    modality: "multimodal",
    domainTags: ["reasoning", "agents", "coding"],
    apiType: "saas",
    contextWindow: 0,
    costPer1kTokens: 0,
    latencyMs: 0,
    license: "proprietary",
    source: "google-ai-dev-docs",
    url: "https://ai.google.dev/",
  
    pros: ["Advanced reasoning", "Strong agentic capabilities"],
    cons: ["Preview release"],
    ragTips: ["Use for complex RAG + multi-step reasoning"],
    typicalUseCases: ["Autonomous agents", "Deep research", "Coding"],
    strengths: ["Reasoning depth"],
    limitations: ["Preview"],
  },

  {
    id: "gemini-3-pro",
    name: "Gemini 3 Pro",
    provider: "Google",
    family: "Gemini 3",
    modality: "multimodal",
    domainTags: ["reasoning", "multimodal"],
    apiType: "saas",
    contextWindow: 0,
    costPer1kTokens: 0,
    latencyMs: 0,
    license: "proprietary",
    source: "google-ai-dev-docs",
    url: "https://ai.google.dev/",
  
    pros: ["State-of-the-art reasoning", "Multimodal understanding"],
    cons: ["Preview"],
    ragTips: ["Use for advanced doc + image reasoning"],
    typicalUseCases: ["Complex analysis", "Vision reasoning"],
    strengths: ["Multimodal reasoning"],
    limitations: ["Preview"],
  },

  {
    id: "gemini-3-flash",
    name: "Gemini 3 Flash",
    provider: "Google",
    family: "Gemini 3",
    modality: "multimodal",
    domainTags: ["low-latency", "cost-efficient"],
    apiType: "saas",
    contextWindow: 0,
    costPer1kTokens: 0,
    latencyMs: 0,
    license: "proprietary",
    source: "google-ai-dev-docs",
    url: "https://ai.google.dev/",
  
    pros: ["Frontier-class performance at lower cost"],
    cons: ["Preview"],
    ragTips: ["High-throughput RAG"],
    typicalUseCases: ["Chatbots", "Summarization"],
    strengths: ["Speed"],
    limitations: ["Preview"],
  },

  {
    id: "gemini-2.5-pro",
    name: "Gemini 2.5 Pro",
    provider: "Google",
    family: "Gemini 2.5",
    modality: "multimodal",
    domainTags: ["reasoning", "coding"],
    apiType: "saas",
    contextWindow: 0,
    costPer1kTokens: 0,
    latencyMs: 0,
    license: "proprietary",
    source: "google-ai-dev-docs",
    url: "https://ai.google.dev/",
  
    pros: ["Advanced reasoning", "Strong coding"],
    cons: [],
    ragTips: ["Use for enterprise assistants"],
    typicalUseCases: ["Complex workflows"],
    strengths: ["Reasoning"],
    limitations: [],
  },

  {
    id: "gemini-2.5-flash",
    name: "Gemini 2.5 Flash",
    provider: "Google",
    family: "Gemini 2.5",
    modality: "multimodal",
    domainTags: ["low-latency", "high-volume"],
    apiType: "saas",
    contextWindow: 0,
    costPer1kTokens: 0,
    latencyMs: 0,
    license: "proprietary",
    source: "google-ai-dev-docs",
    url: "https://ai.google.dev/",
  
    pros: ["Best price-performance"],
    cons: [],
    ragTips: ["Production RAG"],
    typicalUseCases: ["Customer support"],
    strengths: ["Speed"],
    limitations: [],
  },

  {
    id: "gemini-2.5-flash-lite",
    name: "Gemini 2.5 Flash-Lite",
    provider: "Google",
    family: "Gemini 2.5",
    modality: "multimodal",
    domainTags: ["fast", "budget"],
    apiType: "saas",
    contextWindow: 0,
    costPer1kTokens: 0,
    latencyMs: 0,
    license: "proprietary",
    source: "google-ai-dev-docs",
    url: "https://ai.google.dev/",
  
    pros: ["Fastest in 2.5 family"],
    cons: [],
    ragTips: ["Lightweight classification"],
    typicalUseCases: ["Routing", "Intent detection"],
    strengths: ["Speed"],
    limitations: [],
  },

  {
    id: "gemini-2.5-flash-live-preview",
    name: "Gemini 2.5 Flash Live Preview",
    provider: "Google",
    family: "Gemini",
    modality: "audio",
    domainTags: ["realtime", "voice", "live", "streaming"],
    apiType: "saas",
    contextWindow: 0,
    costPer1kTokens: 0,
    latencyMs: 0,
    license: "proprietary",
    source: "google-ai-dev-docs",
    url: "https://ai.google.dev/",
  
    pros: [
      "Optimized for real-time conversational agents",
      "Native audio streaming",
    ],
    cons: [
      "Preview model (APIs/limits may change)",
    ],
    ragTips: [
      "Use short, structured retrieval snippets for spoken responses",
      "Cache system + persona prompts to reduce latency",
    ],
    typicalUseCases: [
      "Voice assistants",
      "Realtime call-style agents",
      "Live support agents",
    ],
    strengths: [
      "Low-latency audio interaction",
      "Conversational flow",
    ],
    limitations: [
      "Preview stability",
      "Audio-focused (not for heavy offline batch reasoning)",
    ],
  },  

  {
    id: "gemini-2.5-flash-tts-preview",
    name: "Gemini 2.5 Flash TTS Preview",
    provider: "Google",
    family: "Gemini",
    modality: "audio",
    domainTags: ["text-to-speech", "low-latency"],
    apiType: "saas",
    contextWindow: 0,
    costPer1kTokens: 0,
    latencyMs: 0,
    license: "proprietary",
    source: "google-ai-dev-docs",
    url: "https://ai.google.dev/",
  
    pros: [
      "Fast controllable speech synthesis",
      "Good for real-time assistants",
    ],
    cons: [
      "Preview model (may change)",
    ],
    ragTips: [
      "Generate text first, then TTS as a separate step for control",
    ],
    typicalUseCases: [
      "Realtime assistants",
      "Fast narration",
    ],
    strengths: [
      "Speed",
      "Control over pacing/style (relative to basic TTS)",
    ],
    limitations: [
      "Preview stability",
    ],
  },
  
  {
    id: "gemini-2.5-pro-tts-preview",
    name: "Gemini 2.5 Pro TTS Preview",
    provider: "Google",
    family: "Gemini",
    modality: "audio",
    domainTags: ["text-to-speech", "high-fidelity"],
    apiType: "saas",
    contextWindow: 0,
    costPer1kTokens: 0,
    latencyMs: 0,
    license: "proprietary",
    source: "google-ai-dev-docs",
    url: "https://ai.google.dev/",
  
    pros: [
      "Higher-fidelity speech synthesis",
      "Better for structured, long-form audio",
    ],
    cons: [
      "Preview model (may change)",
    ],
    ragTips: [
      "Use clean SSML-like formatting (if supported) and structured scripts",
    ],
    typicalUseCases: [
      "Podcasts and audiobooks",
      "High-quality narration",
    ],
    strengths: [
      "Audio quality",
      "Clarity for long-form output",
    ],
    limitations: [
      "Preview stability",
    ],
  },
  // =========================
// Google — Generative Media Models
// =========================

{
  id: "nano-banana",
  name: "Nano Banana",
  provider: "Google",
  family: "Nano Banana",
  modality: "image",
  domainTags: ["image-generation", "image-editing"],
  apiType: "saas",
  contextWindow: 0,
  costPer1kTokens: 0,
  latencyMs: 0,
  license: "proprietary",
  source: "google-ai-dev-docs",
  url: "https://ai.google.dev/",

  pros: [
    "Native image generation and editing",
    "Fast creative workflows",
  ],
  cons: [
    "Preview/availability can vary by region and API access",
  ],
  ragTips: [
    "For product images, provide explicit style + constraints (lighting, background, aspect ratio)",
    "Use reference images where supported for consistency",
  ],
  typicalUseCases: [
    "Marketing creatives",
    "Image edits (background, object tweaks)",
    "Concept art and ideation",
  ],
  strengths: [
    "Fast iteration",
    "Context-aware edits",
  ],
  limitations: [
    "Not a text LLM",
    "Exact feature set depends on endpoint/version",
  ],
},

{
  id: "nano-banana-pro-preview",
  name: "Nano Banana Pro Preview",
  provider: "Google",
  family: "Nano Banana",
  modality: "image",
  domainTags: ["image-generation", "image-editing", "design", "pro"],
  apiType: "saas",
  contextWindow: 0,
  costPer1kTokens: 0,
  latencyMs: 0,
  license: "proprietary",
  source: "google-ai-dev-docs",
  url: "https://ai.google.dev/",

  pros: [
    "Higher-end design quality for complex layouts",
    "Better handling of detailed compositions",
  ],
  cons: [
    "Preview model (APIs/limits may change)",
  ],
  ragTips: [
    "Specify layout constraints (grid, margins, typography) to reduce randomness",
    "Provide exact copy text for best text rendering (where supported)",
  ],
  typicalUseCases: [
    "Professional design mockups",
    "Brand creatives with precise layout",
    "High-detail editing workflows",
  ],
  strengths: [
    "Composition quality",
    "Design control (relative to basic image models)",
  ],
  limitations: [
    "Preview stability",
    "Not intended for long-form text reasoning",
  ],
},

{
  id: "imagen-4",
  name: "Imagen 4",
  provider: "Google",
  family: "Imagen",
  modality: "image",
  domainTags: ["text-to-image", "image-generation"],
  apiType: "saas",
  contextWindow: 0,
  costPer1kTokens: 0,
  latencyMs: 0,
  license: "proprietary",
  source: "google-ai-dev-docs",
  url: "https://ai.google.dev/",

  pros: [
    "High-quality text-to-image generation",
    "Strong clarity for detailed prompts",
  ],
  cons: [
    "Not designed for image editing-first workflows compared to native edit models",
  ],
  ragTips: [
    "Use structured prompts: subject + environment + lighting + lens + style + negatives",
    "Generate multiple candidates and select best (n>1) for reliability",
  ],
  typicalUseCases: [
    "Text-to-image generation",
    "Product and campaign visuals",
    "Illustrations and branding assets",
  ],
  strengths: [
    "Image quality",
    "Prompt adherence (varies by prompt)",
  ],
  limitations: [
    "Not a general-purpose text LLM",
  ],
},

{
  id: "veo-3.1-preview",
  name: "Veo 3.1 Preview",
  provider: "Google",
  family: "Veo",
  modality: "video",
  domainTags: ["video-generation", "cinematic", "text-to-video"],
  apiType: "saas",
  contextWindow: 0,
  costPer1kTokens: 0,
  latencyMs: 0,
  license: "proprietary",
  source: "google-ai-dev-docs",
  url: "https://ai.google.dev/",

  pros: [
    "High-end cinematic video generation",
    "Supports creative controls (varies by endpoint)",
  ],
  cons: [
    "Preview model",
    "Video generation can be compute-heavy and slower",
  ],
  ragTips: [
    "Write shot-based prompts: scene 1/2/3 with camera + motion cues",
    "Keep characters/objects consistent by repeating key descriptors",
  ],
  typicalUseCases: [
    "Marketing video concepts",
    "Storyboards and pre-visualization",
    "Short cinematic clips",
  ],
  strengths: [
    "Video quality potential",
    "Creative control",
  ],
  limitations: [
    "Preview stability",
    "Not suited for text reasoning tasks",
  ],
},

{
  id: "lyria-experimental",
  name: "Lyria Experimental",
  provider: "Google",
  family: "Lyria",
  modality: "audio",
  domainTags: ["music-generation", "audio", "creative"],
  apiType: "saas",
  contextWindow: 0,
  costPer1kTokens: 0,
  latencyMs: 0,
  license: "proprietary",
  source: "google-ai-dev-docs",
  url: "https://ai.google.dev/",

  pros: [
    "Music generation with granular creative control (e.g., instruments/BPM, depending on endpoint)",
  ],
  cons: [
    "Experimental (quality + API may change)",
  ],
  ragTips: [
    "Provide explicit genre + tempo + instrumentation + structure (intro/verse/chorus)",
  ],
  typicalUseCases: [
    "Background music",
    "Creative prototyping",
    "Soundtrack drafts",
  ],
  strengths: [
    "Creative variety",
    "Music-focused control",
  ],
  limitations: [
    "Experimental stability",
    "Not a text LLM",
  ],
},

// =========================
// Google — Tool / Agent Models
// =========================

{
  id: "computer-use-preview",
  name: "Computer Use Preview",
  provider: "Google",
  family: "Gemini Agents",
  modality: "multimodal",
  domainTags: ["agents", "automation", "ui", "computer-use"],
  apiType: "saas",
  contextWindow: 0,
  costPer1kTokens: 0,
  latencyMs: 0,
  license: "proprietary",
  source: "google-ai-dev-docs",
  url: "https://ai.google.dev/",

  pros: [
    "Can interpret a screen and perform UI actions (click/type/navigate)",
    "Useful for browser automation workflows",
  ],
  cons: [
    "Preview model",
    "Reliability depends on UI complexity and app changes",
  ],
  ragTips: [
    "Use step-by-step plans and verify each action with a screen readback",
    "Add guardrails (allowed domains/actions) to reduce risky automation",
  ],
  typicalUseCases: [
    "Browser task automation",
    "Form filling and repetitive workflows",
    "QA / test flows (where allowed)",
  ],
  strengths: [
    "UI grounding",
    "Automation potential",
  ],
  limitations: [
    "Preview stability",
    "Can fail on dynamic/complex UIs",
  ],
},

{
  id: "gemini-deep-research-preview",
  name: "Gemini Deep Research Preview",
  provider: "Google",
  family: "Gemini Agents",
  modality: "multimodal",
  domainTags: ["research", "agents", "autonomous", "citations"],
  apiType: "saas",
  contextWindow: 0,
  costPer1kTokens: 0,
  latencyMs: 0,
  license: "proprietary",
  source: "google-ai-dev-docs",
  url: "https://ai.google.dev/",

  pros: [
    "Agentic research that plans and executes multi-step browsing",
    "Designed for cited research-style outputs",
  ],
  cons: [
    "Preview model",
    "Research quality depends on available sources and query framing",
  ],
  ragTips: [
    "Give a tight research question + constraints (date range, region, trusted sources)",
    "Ask for citations per claim and a short evidence table",
  ],
  typicalUseCases: [
    "Market research",
    "Competitive analysis",
    "Academic-style literature scans",
  ],
  strengths: [
    "Autonomous planning",
    "Synthesis over multiple sources",
  ],
  limitations: [
    "Preview stability",
    "Not guaranteed to access every paywalled source",
  ],
},

// =========================
// Google — Specialized Task Models
// =========================

{
  id: "gemini-embeddings",
  name: "Gemini Embeddings",
  provider: "Google",
  family: "Gemini",
  modality: "text",
  domainTags: ["embeddings", "semantic-search", "rag"],
  apiType: "saas",
  contextWindow: 0,
  costPer1kTokens: 0,
  latencyMs: 0,
  license: "proprietary",
  source: "google-ai-dev-docs",
  url: "https://ai.google.dev/",

  pros: [
    "Vector embeddings for semantic search and RAG",
    "Useful for clustering and classification",
  ],
  cons: [
    "Not a chat/completions model",
  ],
  ragTips: [
    "Use consistent chunking (e.g., 200–600 tokens) and store metadata",
    "Add reranking on top of vector search for best results",
  ],
  typicalUseCases: [
    "Vector search",
    "RAG retrieval layer",
    "Clustering and similarity",
  ],
  strengths: [
    "Semantic representations",
    "Retrieval performance (with good chunking)",
  ],
  limitations: [
    "Requires vector DB + indexing pipeline",
  ],
},

{
  id: "gemini-robotics-preview",
  name: "Gemini Robotics Preview",
  provider: "Google",
  family: "Gemini Robotics",
  modality: "multimodal",
  domainTags: ["robotics", "embodied-ai", "agents"],
  apiType: "saas",
  contextWindow: 0,
  costPer1kTokens: 0,
  latencyMs: 0,
  license: "proprietary",
  source: "google-ai-dev-docs",
  url: "https://ai.google.dev/",

  pros: [
    "Designed for robotics / embodied reasoning (where supported)",
  ],
  cons: [
    "Preview model",
    "Not generally useful unless you’re integrating robotics stacks",
  ],
  ragTips: [
    "Use structured state + action constraints",
    "Log observations and actions for debugging + safety",
  ],
  typicalUseCases: [
    "Robotics research",
    "Embodied task planning",
  ],
  strengths: [
    "Embodied reasoning focus",
  ],
  limitations: [
    "Preview stability",
    "Requires robotics integration to be meaningful",
  ],
},

// Mistral (from Mistral Docs) — matches your exact object structure.
// Notes:
// - costPer1kTokens = **input** price (docs show $/M tokens ⇒ divide by 1000).
// - Audio models priced per minute and OCR priced per 1000 pages → costPer1kTokens left as 0 and noted in limitations.
  // =========================
  // FEATURED / FRONTIER
  // =========================
  {
    id: "mistral-large-2512+1",
    name: "Mistral Large 3",
    provider: "Mistral",
    family: "Mistral Large",
    modality: "multimodal",
    domainTags: ["general", "reasoning", "vision", "open-weight"],
    apiType: "saas",
    contextWindow: 256000,
    costPer1kTokens: 0.0005, // $0.5 / 1M input tokens
    latencyMs: 0,
    license: "open",
    source: "mistral-docs",
    url: "https://docs.mistral.ai/models/mistral-large-3-25-12",

    pros: ["Open-weight flagship", "Strong general reasoning + multimodal"],
    cons: ["Heavier infra if self-hosting weights", "Output cost higher than input"],
    ragTips: ["Use long-context for full docs; chunk less aggressively", "Prefer semantic sections over tiny chunks"],
    typicalUseCases: ["General assistant", "Multimodal RAG", "Agentic workflows"],
    strengths: ["Reasoning", "Vision understanding", "Broad capability"],
    limitations: ["Proprietary API access terms still apply for hosted usage"],
  },

  {
    id: "mistral-medium-2508+1",
    name: "Mistral Medium 3.1",
    provider: "Mistral",
    family: "Mistral Medium",
    modality: "multimodal",
    domainTags: ["general", "balanced", "vision"],
    apiType: "saas",
    contextWindow: 128000,
    costPer1kTokens: 0.0004, // $0.4 / 1M input tokens
    latencyMs: 0,
    license: "proprietary",
    source: "mistral-docs",
    url: "https://docs.mistral.ai/models/mistral-medium-3-1-25-08",

    pros: ["Frontier-class multimodal", "Good balance of quality/cost"],
    cons: ["Output cost can dominate at scale"],
    ragTips: ["Use retrieval + citations", "Keep context tight; prefer high-signal chunks"],
    typicalUseCases: ["Production assistants", "Enterprise workflows", "Multimodal Q&A"],
    strengths: ["Balanced performance", "Vision + text"],
    limitations: ["Not open-weight"],
  },

  {
    id: "mistral-small-2506+1",
    name: "Mistral Small 3.2",
    provider: "Mistral",
    family: "Mistral Small",
    modality: "multimodal",
    domainTags: ["fast", "cost-efficient", "vision"],
    apiType: "saas",
    contextWindow: 128000,
    costPer1kTokens: 0.0001, // $0.1 / 1M input tokens
    latencyMs: 0,
    license: "open",
    source: "mistral-docs",
    url: "https://docs.mistral.ai/models/mistral-small-3-2-25-06",

    pros: ["Great price-performance", "Open-weight"],
    cons: ["Lower ceiling than Large/Medium on hardest tasks"],
    ragTips: ["Use reranking", "Short, high-signal chunks"],
    typicalUseCases: ["High-volume RAG", "Support automation", "Summarization"],
    strengths: ["Speed", "Cost efficiency"],
    limitations: ["May need careful prompting for complex reasoning"],
  },

  // =========================
  // MINISTRAL (open)
  // =========================
  {
    id: "ministral-14b-2512+1",
    name: "Ministral 3 14B",
    provider: "Mistral",
    family: "Ministral",
    modality: "multimodal",
    domainTags: ["open-weight", "edge", "vision"],
    apiType: "saas",
    contextWindow: 256000,
    costPer1kTokens: 0.0002, // $0.2 / 1M input tokens
    latencyMs: 0,
    license: "open",
    source: "mistral-docs",
    url: "https://docs.mistral.ai/models/ministral-3-14b-25-12",

    pros: ["Strong edge/local deployment option", "Very long context for its size"],
    cons: ["Requires infra/tuning for best results"],
    ragTips: ["Quantize for inference", "Use semantic chunking + rerank"],
    typicalUseCases: ["Private deployments", "On-device/edge assistants", "Doc Q&A"],
    strengths: ["Efficiency", "Long-context"],
    limitations: ["Not the absolute best at hardest reasoning vs top-tier flagships"],
  },

  {
    id: "ministral-8b-2512+1",
    name: "Ministral 3 8B",
    provider: "Mistral",
    family: "Ministral",
    modality: "multimodal",
    domainTags: ["open-weight", "edge", "vision"],
    apiType: "saas",
    contextWindow: 256000,
    costPer1kTokens: 0.00015, // $0.15 / 1M input tokens
    latencyMs: 0,
    license: "open",
    source: "mistral-docs",
    url: "https://docs.mistral.ai/models/ministral-3-8b-25-12",

    pros: ["Efficient + capable", "Long context"],
    cons: ["Lower ceiling than 14B/Large"],
    ragTips: ["Keep retrieval high-signal", "Use reranking"],
    typicalUseCases: ["High-volume assistants", "Edge deployment", "Vision Q&A"],
    strengths: ["Speed", "Cost"],
    limitations: ["May struggle with deepest multi-step reasoning"],
  },

  {
    id: "ministral-3b-2512+1",
    name: "Ministral 3 3B",
    provider: "Mistral",
    family: "Ministral",
    modality: "multimodal",
    domainTags: ["open-weight", "tiny", "edge", "vision"],
    apiType: "saas",
    contextWindow: 256000,
    costPer1kTokens: 0.0001, // $0.1 / 1M input tokens
    latencyMs: 0,
    license: "open",
    source: "mistral-docs",
    url: "https://docs.mistral.ai/models/ministral-3-3b-25-12",

    pros: ["Very small + efficient", "Long context for size"],
    cons: ["Lower quality ceiling on complex tasks"],
    ragTips: ["Use strict retrieval filters", "Prefer short answers + grounding"],
    typicalUseCases: ["Lightweight agents", "Classification", "Edge assistants"],
    strengths: ["Efficiency", "Cost"],
    limitations: ["Not ideal for deep reasoning/coding"],
  },

  // =========================
  // MAGISTRAL (reasoning)
  // =========================
  {
    id: "magistral-medium-2509+1",
    name: "Magistral Medium 1.2",
    provider: "Mistral",
    family: "Magistral",
    modality: "multimodal",
    domainTags: ["reasoning", "multimodal"],
    apiType: "saas",
    contextWindow: 128000,
    costPer1kTokens: 0.002, // $2 / 1M input tokens
    latencyMs: 0,
    license: "proprietary",
    source: "mistral-docs",
    url: "https://docs.mistral.ai/models/magistral-medium-1-2-25-09",

    pros: ["Reasoning-focused frontier model", "Strong for complex analysis"],
    cons: ["Premium pricing tier"],
    ragTips: ["Use citations + grounding", "Use long-context for full artifacts"],
    typicalUseCases: ["High-stakes reasoning", "Complex RAG", "Planning workflows"],
    strengths: ["Reasoning depth"],
    limitations: ["Not open-weight"],
  },

  {
    id: "magistral-small-2509+1",
    name: "Magistral Small 1.2",
    provider: "Mistral",
    family: "Magistral",
    modality: "multimodal",
    domainTags: ["reasoning", "cost-efficient"],
    apiType: "saas",
    contextWindow: 128000,
    costPer1kTokens: 0.0005, // $0.5 / 1M input tokens
    latencyMs: 0,
    license: "open",
    source: "mistral-docs",
    url: "https://docs.mistral.ai/models/magistral-small-1-2-25-09",

    pros: ["Reasoning-oriented small model", "Open-weight"],
    cons: ["Lower ceiling than Magistral Medium"],
    ragTips: ["Use retrieval + rerank", "Keep prompts structured"],
    typicalUseCases: ["Reasoning at scale", "RAG assistants", "Summarization + analysis"],
    strengths: ["Reasoning per cost"],
    limitations: ["May require better prompting for very hard problems"],
  },

  // =========================
  // SPECIALIST: OCR
  // =========================
  {
    id: "mistral-ocr-2512+1",
    name: "OCR 3",
    provider: "Mistral",
    family: "OCR",
    modality: "multimodal",
    domainTags: ["ocr", "document-ai"],
    apiType: "saas",
    contextWindow: 0,
    costPer1kTokens: 0,
    latencyMs: 0,
    license: "proprietary",
    source: "mistral-docs",
    url: "https://docs.mistral.ai/models/ocr-3-25-12",

    pros: ["Document AI OCR service", "Handles interleaved text/images"],
    cons: ["Priced per page (not per token)"],
    ragTips: ["Run OCR → chunk extracted text → embed + retrieve", "Preserve layout/section headers as metadata"],
    typicalUseCases: ["PDF extraction", "Form understanding", "Doc ingestion pipelines"],
    strengths: ["OCR quality", "Doc workflows"],
    limitations: ["Pricing is $/1000 pages (see docs)"],
  },

  {
    id: "mistral-ocr-2505",
    name: "OCR 2",
    provider: "Mistral",
    family: "OCR",
    modality: "multimodal",
    domainTags: ["ocr", "document-ai"],
    apiType: "saas",
    contextWindow: 0,
    costPer1kTokens: 0,
    latencyMs: 0,
    license: "proprietary",
    source: "mistral-docs",
    url: "https://docs.mistral.ai/models/ocr-2-25-05",

    pros: ["OCR service for Document AI"],
    cons: ["Priced per page (not per token)"],
    ragTips: ["Store bounding boxes/regions if you do layout-aware retrieval"],
    typicalUseCases: ["Doc ingestion", "Scanning pipelines"],
    strengths: ["OCR extraction"],
    limitations: ["Pricing is $/1000 pages (see docs)"],
  },

  // =========================
  // AUDIO: VOXTRAL (transcription + audio input)
  // =========================
  {
    id: "voxtral-mini-2507+1",
    name: "Voxtral Mini",
    provider: "Mistral",
    family: "Voxtral",
    modality: "audio",
    domainTags: ["audio", "speech-to-text", "transcription"],
    apiType: "saas",
    contextWindow: 32000,
    costPer1kTokens: 0, // priced per minute + tokens; see docs
    latencyMs: 0,
    license: "open",
    source: "mistral-docs",
    url: "https://docs.mistral.ai/models/voxtral-mini-25-07",

    pros: ["Efficient audio input model"],
    cons: ["Pricing includes $/min (see docs)"],
    ragTips: ["Transcribe → clean → chunk by speaker/turn", "Attach timestamps as metadata"],
    typicalUseCases: ["Meeting notes", "Voice assistants", "Audio ingestion"],
    strengths: ["Audio input efficiency"],
    limitations: ["Pricing is per minute (and may include token components)"],
  },

  {
    id: "voxtral-small-2507+1",
    name: "Voxtral Small",
    provider: "Mistral",
    family: "Voxtral",
    modality: "audio",
    domainTags: ["audio", "speech-to-text", "instruct"],
    apiType: "saas",
    contextWindow: 32000,
    costPer1kTokens: 0, // priced per minute + tokens; see docs
    latencyMs: 0,
    license: "open",
    source: "mistral-docs",
    url: "https://docs.mistral.ai/models/voxtral-small-25-07",

    pros: ["Audio input + instruct use cases"],
    cons: ["Pricing includes $/min (see docs)"],
    ragTips: ["Use diarization if needed", "Chunk by topic shifts"],
    typicalUseCases: ["Voice agents", "Audio Q&A", "Transcription workflows"],
    strengths: ["Audio capability"],
    limitations: ["Pricing is per minute (and may include token components)"],
  },

  {
    id: "voxtral-mini-2602+1",
    name: "Voxtral Mini Transcribe 2",
    provider: "Mistral",
    family: "Voxtral",
    modality: "audio",
    domainTags: ["transcription", "speech-to-text"],
    apiType: "saas",
    contextWindow: 0, // docs show "--"
    costPer1kTokens: 0, // $0.003 / min
    latencyMs: 0,
    license: "proprietary",
    source: "mistral-docs",
    url: "https://docs.mistral.ai/models/voxtral-mini-transcribe-26-02",

    pros: ["Optimized for transcription"],
    cons: ["Per-minute pricing (not per token)"],
    ragTips: ["Store timestamps", "Chunk per speaker/turn"],
    typicalUseCases: ["Batch transcription", "Meeting/audio ingestion"],
    strengths: ["Transcription focus"],
    limitations: ["Priced at $/min (see docs)"],
  },

  {
    id: "voxtral-mini-transcribe-realtime-2602+1",
    name: "Voxtral Mini Transcribe Realtime",
    provider: "Mistral",
    family: "Voxtral",
    modality: "audio",
    domainTags: ["transcription", "realtime", "speech-to-text"],
    apiType: "saas",
    contextWindow: 0, // docs show "--"
    costPer1kTokens: 0, // $0.006 / min
    latencyMs: 0,
    license: "open",
    source: "mistral-docs",
    url: "https://docs.mistral.ai/models/voxtral-mini-transcribe-realtime-26-02",

    pros: ["Live transcription optimized"],
    cons: ["Per-minute pricing"],
    ragTips: ["Stream → segment into utterances", "Attach timestamps for retrieval"],
    typicalUseCases: ["Realtime captions", "Live meeting transcription"],
    strengths: ["Realtime transcription"],
    limitations: ["Priced at $/min (see docs)"],
  },

  // =========================
  // CODING
  // =========================
  {
    id: "codestral-2508+1",
    name: "Codestral",
    provider: "Mistral",
    family: "Codestral",
    modality: "text",
    domainTags: ["coding", "code-completion", "fim"],
    apiType: "saas",
    contextWindow: 128000,
    costPer1kTokens: 0.0003, // $0.3 / 1M input tokens
    latencyMs: 0,
    license: "proprietary",
    source: "mistral-docs",
    url: "https://docs.mistral.ai/models/codestral-25-08",

    pros: ["Strong for code completion", "Optimized for low-latency coding tasks"],
    cons: ["Not open-weight"],
    ragTips: ["Use repo-map + file-level retrieval", "Prefer FIM prompting for edits"],
    typicalUseCases: ["IDE copilot", "Code generation", "FIM editing"],
    strengths: ["Coding speed", "FIM workflows"],
    limitations: ["Less suited for broad multimodal tasks"],
  },

  {
    id: "devstral-2512+2",
    name: "Devstral 2",
    provider: "Mistral",
    family: "Devstral",
    modality: "multimodal",
    domainTags: ["agents", "coding", "tool-use", "swe"],
    apiType: "saas",
    contextWindow: 256000,
    costPer1kTokens: 0.0004, // $0.4 / 1M input tokens
    latencyMs: 0,
    license: "open",
    source: "mistral-docs",
    url: "https://docs.mistral.ai/models/devstral-2-25-12",

    pros: ["SWE agent focus", "Very long context"],
    cons: ["Output cost higher; agent runs can get expensive"],
    ragTips: ["Use tool logging + short intermediate summaries", "Cache repo index + embeddings"],
    typicalUseCases: ["Codebase exploration", "Multi-file edits", "Agentic SWE tasks"],
    strengths: ["Tool use", "Long-context code understanding"],
    limitations: ["May require guardrails for autonomous actions"],
  },

  {
    id: "codestral-embed-2505+1",
    name: "Codestral Embed",
    provider: "Mistral",
    family: "Codestral",
    modality: "text",
    domainTags: ["embeddings", "code-search", "semantic-search"],
    apiType: "saas",
    contextWindow: 8000,
    costPer1kTokens: 0.00015, // $0.15 / 1M tokens
    latencyMs: 0,
    license: "proprietary",
    source: "mistral-docs",
    url: "https://docs.mistral.ai/models/codestral-embed-25-05",

    pros: ["Code-focused embeddings"],
    cons: ["Small context compared to chat models (expected for embeddings)"],
    ragTips: ["Index at function/class granularity", "Store path + symbols metadata"],
    typicalUseCases: ["Code semantic search", "Repo RAG", "Duplicate detection"],
    strengths: ["Code retrieval quality"],
    limitations: ["Embeddings only (no generation)"],
  },

  // =========================
  // MODERATION
  // =========================
  {
    id: "mistral-moderation-2411+1",
    name: "Mistral Moderation",
    provider: "Mistral",
    family: "Moderation",
    modality: "text",
    domainTags: ["moderation", "safety"],
    apiType: "saas",
    contextWindow: 8000,
    costPer1kTokens: 0.0001, // $0.1 / 1M tokens
    latencyMs: 0,
    license: "proprietary",
    source: "mistral-docs",
    url: "https://docs.mistral.ai/models/mistral-moderation-24-11",

    pros: ["Dedicated moderation endpoint"],
    cons: ["Not a general chat model"],
    ragTips: [],
    typicalUseCases: ["Content filtering", "Safety checks", "Policy enforcement"],
    strengths: ["Safety classification"],
    limitations: ["Moderation-only"],
  },

  // =========================
  // OTHER MODELS (still supported in docs list you pasted)
  // =========================
  {
    id: "labs-mistral-small-creative",
    name: "Mistral Small Creative",
    provider: "Mistral",
    family: "Mistral Small",
    modality: "text",
    domainTags: ["creative-writing", "roleplay", "dialog"],
    apiType: "saas",
    contextWindow: 32000,
    costPer1kTokens: 0.0001, // $0.1 / 1M input tokens
    latencyMs: 0,
    license: "proprietary",
    source: "mistral-docs",
    url: "https://docs.mistral.ai/models/mistral-small-creative-25-12",

    pros: ["Creative writing + character dialog"],
    cons: ["Not optimized for strict factuality"],
    ragTips: ["If used with RAG, enforce citations + quote grounding"],
    typicalUseCases: ["Creative writing", "Story/dialog generation"],
    strengths: ["Style + creativity"],
    limitations: ["May hallucinate if used for factual tasks"],
  },

  {
    id: "labs-devstral-small-2512+1",
    name: "Devstral Small 2",
    provider: "Mistral",
    family: "Devstral",
    modality: "multimodal",
    domainTags: ["agents", "coding", "tool-use", "swe"],
    apiType: "saas",
    contextWindow: 256000,
    costPer1kTokens: 0, // docs show $0 plus priced tiers; keep 0 here
    latencyMs: 0,
    license: "proprietary",
    source: "mistral-docs",
    url: "https://docs.mistral.ai/models/devstral-small-2-25-12",

    pros: ["Labs SWE agent model", "Long context"],
    cons: ["Labs availability/terms may change"],
    ragTips: ["Repo indexing + tool logs", "Cache intermediate plans"],
    typicalUseCases: ["SWE agents", "Codebase editing"],
    strengths: ["Tool use"],
    limitations: ["Labs model; pricing/terms in docs"],
  },

  {
    id: "devstral-medium-2507",
    name: "Devstral Medium 1.0",
    provider: "Mistral",
    family: "Devstral",
    modality: "text",
    domainTags: ["agents", "coding", "tool-use", "swe"],
    apiType: "saas",
    contextWindow: 128000,
    costPer1kTokens: 0.0004, // $0.4 / 1M input tokens
    latencyMs: 0,
    license: "proprietary",
    source: "mistral-docs",
    url: "https://docs.mistral.ai/models/devstral-medium-1-0-25-07",

    pros: ["Enterprise SWE workflows"],
    cons: ["Premium output pricing"],
    ragTips: ["Use tool routing", "Summarize + checkpoint long runs"],
    typicalUseCases: ["Enterprise SWE agents", "Refactors", "Code review automation"],
    strengths: ["SWE focus"],
    limitations: ["Text-only"],
  },

  {
    id: "devstral-small-2507",
    name: "Devstral Small 1.1",
    provider: "Mistral",
    family: "Devstral",
    modality: "text",
    domainTags: ["agents", "coding", "tool-use", "swe"],
    apiType: "saas",
    contextWindow: 128000,
    costPer1kTokens: 0.0001, // $0.1 / 1M input tokens
    latencyMs: 0,
    license: "open",
    source: "mistral-docs",
    url: "https://docs.mistral.ai/models/devstral-small-1-1-25-07",

    pros: ["Open-weight SWE-oriented model"],
    cons: ["Lower ceiling than larger Devstral tiers"],
    ragTips: ["Use repo embeddings + rerank", "Keep edit instructions tight"],
    typicalUseCases: ["Tool-using agents", "Multi-file edits", "Repo Q&A"],
    strengths: ["Efficiency", "Tool use"],
    limitations: ["Text-only"],
  },

  {
    id: "mistral-medium-2505",
    name: "Mistral Medium 3",
    provider: "Mistral",
    family: "Mistral Medium",
    modality: "multimodal",
    domainTags: ["general", "vision"],
    apiType: "saas",
    contextWindow: 128000,
    costPer1kTokens: 0.0004, // $0.4 / 1M input tokens
    latencyMs: 0,
    license: "proprietary",
    source: "mistral-docs",
    url: "https://docs.mistral.ai/models/mistral-medium-3-25-05",

    pros: ["Frontier-class multimodal baseline"],
    cons: ["Output pricing can dominate"],
    ragTips: ["Use retrieval + citations", "Prefer semantic chunking"],
    typicalUseCases: ["General assistants", "Vision+text workflows"],
    strengths: ["Balanced multimodal"],
    limitations: ["Not open-weight"],
  },

  {
    id: "mistral-large-2411",
    name: "Mistral Large 2.1",
    provider: "Mistral",
    family: "Mistral Large",
    modality: "multimodal",
    domainTags: ["general", "high-complexity", "vision"],
    apiType: "saas",
    contextWindow: 128000,
    costPer1kTokens: 0.002, // $2 / 1M input tokens
    latencyMs: 0,
    license: "proprietary",
    source: "mistral-docs",
    url: "https://docs.mistral.ai/models/mistral-large-2-1-24-11",

    pros: ["Strong for hard tasks"],
    cons: ["Higher cost tier"],
    ragTips: ["Use long-context for full docs/codebases"],
    typicalUseCases: ["Complex analysis", "Coding + planning"],
    strengths: ["Reasoning", "General performance"],
    limitations: ["Not open-weight"],
  },

  {
    id: "pixtral-large-2411+1",
    name: "Pixtral Large",
    provider: "Mistral",
    family: "Pixtral",
    modality: "multimodal",
    domainTags: ["vision", "multimodal"],
    apiType: "saas",
    contextWindow: 128000,
    costPer1kTokens: 0.002, // $2 / 1M input tokens
    latencyMs: 0,
    license: "proprietary",
    source: "mistral-docs",
    url: "https://docs.mistral.ai/models/pixtral-large-24-11",

    pros: ["Strong multimodal/vision model"],
    cons: ["Higher cost tier"],
    ragTips: ["For images/docs: keep relevant pages; avoid overloading context"],
    typicalUseCases: ["Image + doc understanding", "Multimodal assistants"],
    strengths: ["Vision"],
    limitations: ["Not open-weight"],
  },

  {
    id: "open-mistral-nemo-2407+1",
    name: "Mistral Nemo 12B",
    provider: "Mistral",
    family: "Mistral Nemo",
    modality: "multimodal",
    domainTags: ["multilingual", "open-weight", "vision"],
    apiType: "saas",
    contextWindow: 128000,
    costPer1kTokens: 0.00015, // $0.15 / 1M input tokens
    latencyMs: 0,
    license: "open",
    source: "mistral-docs",
    url: "https://docs.mistral.ai/models/mistral-nemo-12b-24-07",

    pros: ["Strong multilingual open model"],
    cons: ["Older generation vs newest frontier tiers"],
    ragTips: ["Use language-aware chunking", "Store language metadata in vectors"],
    typicalUseCases: ["Multilingual RAG", "Global assistants"],
    strengths: ["Multilingual"],
    limitations: ["May underperform newest flagships on hardest tasks"],
  },

  {
    id: "mistral-embed-2312+1",
    name: "Mistral Embed",
    provider: "Mistral",
    family: "Embeddings",
    modality: "text",
    domainTags: ["embeddings", "semantic-search", "rag"],
    apiType: "saas",
    contextWindow: 8000,
    costPer1kTokens: 0.0001, // $0.1 / 1M tokens
    latencyMs: 0,
    license: "proprietary",
    source: "mistral-docs",
    url: "https://docs.mistral.ai/models/mistral-embed-23-12",

    pros: ["General-purpose embeddings for RAG"],
    cons: ["Embeddings only (no generation)"],
    ragTips: ["Use consistent chunk sizes", "Store source + section metadata"],
    typicalUseCases: ["Vector search", "RAG indexing", "Clustering"],
    strengths: ["Semantic retrieval"],
    limitations: ["Not a chat model"],
  },
  
  //=========================
  //COHERE — COMMAND FAMILY
  //=========================
  {
    id: "command-a-03-2025",
    name: "Command A",
    provider: "Cohere",
    family: "Command",
    modality: "text",
    domainTags: ["agents", "rag", "tool-use", "multilingual"],
    apiType: "saas",
    contextWindow: 256000,
    costPer1kTokens: 0,
    latencyMs: 0,
    license: "proprietary",
    source: "cohere-docs",
    url: "https://docs.cohere.com/docs/models",
  
    pros: [
      "Most performant Cohere model",
      "Strong tool use and agent workflows",
      "High throughput",
    ],
    cons: [
      "Enterprise-oriented pricing tier",
    ],
    ragTips: [
      "Use with Rerank for higher retrieval precision",
      "Chunk at 400–800 tokens for best performance",
    ],
    typicalUseCases: [
      "Enterprise RAG systems",
      "Agents with tools",
      "Multilingual assistants",
    ],
    strengths: [
      "Tool use",
      "Long context",
      "Multilingual reasoning",
    ],
    limitations: [
      "Text-only (no vision)",
    ],
  },

  {
    id: "command-a-reasoning-08-2025",
    name: "Command A Reasoning",
    provider: "Cohere",
    family: "Command",
    modality: "text",
    domainTags: ["reasoning", "agents", "multilingual"],
    apiType: "saas",
    contextWindow: 256000,
    costPer1kTokens: 0,
    latencyMs: 0,
    license: "proprietary",
    source: "cohere-docs",
    url: "https://docs.cohere.com/docs/models",
  
    pros: [
      "Reasoning-first architecture",
      "Strong multi-step planning",
    ],
    cons: [
      "Higher latency than non-reasoning variants",
    ],
    ragTips: [
      "Use when complex chain-of-thought reasoning is required",
    ],
    typicalUseCases: [
      "Planning agents",
      "Complex analysis",
      "Multi-step RAG",
    ],
    strengths: [
      "Structured reasoning",
    ],
    limitations: [
      "Text-only",
    ],
  },

  {
    id: "command-a-vision-07-2025",
    name: "Command A Vision",
    provider: "Cohere",
    family: "Command",
    modality: "multimodal",
    domainTags: ["vision", "document-ai", "ocr"],
    apiType: "saas",
    contextWindow: 128000,
    costPer1kTokens: 0,
    latencyMs: 0,
    license: "proprietary",
    source: "cohere-docs",
    url: "https://docs.cohere.com/docs/models",
  
    pros: [
      "Image + text understanding",
      "Strong document Q&A",
    ],
    cons: [
      "Supports fewer languages than text-only Command A",
    ],
    ragTips: [
      "Use structured doc chunks with image references",
    ],
    typicalUseCases: [
      "Chart analysis",
      "OCR pipelines",
      "Document Q&A",
    ],
    strengths: [
      "Enterprise vision tasks",
    ],
    limitations: [
      "Not optimized for video/audio",
    ],
  },

  {
    id: "command-r7b-12-2024",
    name: "Command R7B",
    provider: "Cohere",
    family: "Command",
    modality: "text",
    domainTags: ["rag", "agents", "efficient"],
    apiType: "saas",
    contextWindow: 128000,
    costPer1kTokens: 0,
    latencyMs: 0,
    license: "proprietary",
    source: "cohere-docs",
    url: "https://docs.cohere.com/docs/models",
  
    pros: [
      "Small + fast",
      "Optimized for RAG and agents",
    ],
    cons: [
      "Lower ceiling than Command A",
    ],
    ragTips: [
      "Ideal for cost-sensitive RAG systems",
    ],
    typicalUseCases: [
      "Production RAG",
      "Lightweight agents",
    ],
    strengths: [
      "Efficiency",
    ],
    limitations: [
      "Text-only",
    ],
  },

  //=========================
//COHERE — EMBED MODELS
//=========================

  {
    id: "embed-v4.0",
    name: "Embed v4.0",
    provider: "Cohere",
    family: "Embed",
    modality: "text",
    domainTags: ["embeddings", "rag", "semantic-search"],
    apiType: "saas",
    contextWindow: 128000,
    costPer1kTokens: 0,
    latencyMs: 0,
    license: "proprietary",
    source: "cohere-docs",
    url: "https://docs.cohere.com/docs/embed",

    pros: [
      "Supports text + images",
      "Flexible embedding dimensions",
    ],
    cons: [
      "Embeddings only (no generation)",
    ],
    ragTips: [
      "Store metadata (source, section, language)",
    ],
    typicalUseCases: [
      "Vector search",
      "Clustering",
      "Semantic similarity",
    ],
    strengths: [
      "Multimodal embeddings",
    ],
    limitations: [
      "Requires vector database",
    ],
  },  

  {
    id: "embed-multilingual-v3.0",
    name: "Embed Multilingual v3.0",
    provider: "Cohere",
    family: "Embed",
    modality: "text",
    domainTags: ["embeddings", "multilingual", "rag"],
    apiType: "saas",
    contextWindow: 512,
    costPer1kTokens: 0,
    latencyMs: 0,
    license: "proprietary",
    source: "cohere-docs",
    url: "https://docs.cohere.com/docs/embed",

    pros: [
      "Multilingual embedding support",
    ],
    cons: [
      "Shorter context window",
    ],
    ragTips: [
      "Use consistent chunking across languages",
    ],
    typicalUseCases: [
      "Global RAG",
      "Multilingual search",
    ],
    strengths: [
      "Language coverage",
    ],
    limitations: [
      "Embeddings only",
    ],
  },

  //=========================
   //COHERE — RERANK
  //=========================
  {
    id: "rerank-v4.0-pro",
    name: "Rerank v4.0 Pro",
    provider: "Cohere",
    family: "Rerank",
    modality: "text",
    domainTags: ["rerank", "search", "rag"],
    apiType: "saas",
    contextWindow: 32000,
    costPer1kTokens: 0,
    latencyMs: 0,
    license: "proprietary",
    source: "cohere-docs",
    url: "https://docs.cohere.com/docs/rerank",
  
    pros: [
      "High-quality re-ranking",
      "Multilingual support",
    ],
    cons: [
      "Separate endpoint from chat",
    ],
    ragTips: [
      "Use after vector retrieval to improve ranking precision",
    ],
    typicalUseCases: [
      "Search systems",
      "RAG pipelines",
    ],
    strengths: [
      "Precision ranking",
    ],
    limitations: [
      "Does not generate text",
    ],
  },

  //=========================
  //COHERE — AYA FAMILY
  //=========================

  {
    id: "c4ai-aya-expanse-8b",
    name: "Aya Expanse 8B",
    provider: "Cohere",
    family: "Aya",
    modality: "text",
    domainTags: ["multilingual", "open-weight"],
    apiType: "saas",
    contextWindow: 8000,
    costPer1kTokens: 0,
    latencyMs: 0,
    license: "open",
    source: "cohere-docs",
    url: "https://docs.cohere.com/docs/aya",
  
    pros: [
      "Multilingual (23 languages)",
      "Optimized for low latency",
    ],
    cons: [
      "Smaller model size",
    ],
    ragTips: [
      "Use language-aware chunking",
    ],
    typicalUseCases: [
      "Global assistants",
      "Cross-language RAG",
    ],
    strengths: [
      "Language coverage",
    ],
    limitations: [
      "Text-only",
    ],
  },

  {
    id: "c4ai-aya-vision-32b",
    name: "Aya Vision 32B",
    provider: "Cohere",
    family: "Aya",
    modality: "multimodal",
    domainTags: ["multilingual", "vision"],
    apiType: "saas",
    contextWindow: 16000,
    costPer1kTokens: 0,
    latencyMs: 0,
    license: "open",
    source: "cohere-docs",
    url: "https://docs.cohere.com/docs/aya",
  
    pros: [
      "Multilingual + vision",
      "Strong benchmark performance",
    ],
    cons: [
      "Higher compute requirements",
    ],
    ragTips: [
      "Combine text + image retrieval when using multimodal RAG",
    ],
    typicalUseCases: [
      "Vision Q&A",
      "Multilingual document analysis",
    ],
    strengths: [
      "Multimodal multilingual",
    ],
    limitations: [
      "Limited output token cap",
    ],
  },

  //=========================
  //ALIBABA — QWEN 2.5 (LATEST)
  //=========================

  {
    id: "qwen2.5-72b-instruct",
    name: "Qwen 2.5 72B Instruct",
    provider: "Alibaba",
    family: "Qwen 2.5",
    modality: "text",
    domainTags: ["general", "reasoning", "open-weight"],
    apiType: "saas",
    contextWindow: 128000,
    costPer1kTokens: 0,
    latencyMs: 0,
    license: "open",
    source: "alibaba-docs",
    url: "https://qwenlm.github.io/",
  
    pros: [
      "Strong open-weight flagship",
      "Good reasoning and multilingual performance",
    ],
    cons: [
      "Requires substantial infrastructure if self-hosted",
    ],
    ragTips: [
      "Use semantic chunking with 400–800 token windows",
    ],
    typicalUseCases: [
      "Enterprise RAG",
      "General assistants",
      "Multilingual chat",
    ],
    strengths: [
      "Open-weight",
      "Multilingual",
    ],
    limitations: [
      "Not multimodal",
    ],
  },

  {
    id: "qwen2.5-32b-instruct",
    name: "Qwen 2.5 32B Instruct",
    provider: "Alibaba",
    family: "Qwen 2.5",
    modality: "text",
    domainTags: ["balanced", "open-weight"],
    apiType: "saas",
    contextWindow: 128000,
    costPer1kTokens: 0,
    latencyMs: 0,
    license: "open",
    source: "alibaba-docs",
    url: "https://qwenlm.github.io/",
  
    pros: [
      "Good balance between performance and compute cost",
    ],
    cons: [
      "Lower ceiling than 72B",
    ],
    ragTips: [
      "Use reranking for higher retrieval precision",
    ],
    typicalUseCases: [
      "Production assistants",
      "Moderate-scale RAG",
    ],
    strengths: [
      "Efficiency",
    ],
    limitations: [
      "Text-only",
    ],
  },

  //=========================
  //QWEN CODER
  //=========================

  {
    id: "qwen2.5-coder-32b",
    name: "Qwen 2.5 Coder 32B",
    provider: "Alibaba",
    family: "Qwen Coder",
    modality: "text",
    domainTags: ["coding", "code-completion", "open-weight"],
    apiType: "saas",
    contextWindow: 128000,
    costPer1kTokens: 0,
    latencyMs: 0,
    license: "open",
    source: "alibaba-docs",
    url: "https://qwenlm.github.io/",
  
    pros: [
      "Strong coding performance",
      "Open-weight model",
    ],
    cons: [
      "Focused primarily on code tasks",
    ],
    ragTips: [
      "Use repo embeddings + file-level retrieval",
    ],
    typicalUseCases: [
      "IDE copilots",
      "Code generation",
      "Code explanation",
    ],
    strengths: [
      "Code reasoning",
    ],
    limitations: [
      "Not multimodal",
    ],
  },

  //=========================
  //QWEN-VL (VISION)
  //=========================

  {
    id: "qwen2.5-vl-72b",
    name: "Qwen 2.5 VL 72B",
    provider: "Alibaba",
    family: "Qwen VL",
    modality: "multimodal",
    domainTags: ["vision", "multimodal", "open-weight"],
    apiType: "saas",
    contextWindow: 128000,
    costPer1kTokens: 0,
    latencyMs: 0,
    license: "open",
    source: "alibaba-docs",
    url: "https://qwenlm.github.io/",
  
    pros: [
      "Image + text reasoning",
      "Strong multimodal benchmarks",
    ],
    cons: [
      "High compute requirements",
    ],
    ragTips: [
      "Attach image captions as metadata in RAG systems",
    ],
    typicalUseCases: [
      "Document analysis",
      "Chart/diagram reasoning",
      "Vision Q&A",
    ],
    strengths: [
      "Multimodal reasoning",
    ],
    limitations: [
      "No native audio support",
    ],
  },

  //=========================
  //QWEN-AUDIO
  //=========================

  {
    id: "qwen-audio",
    name: "Qwen Audio",
    provider: "Alibaba",
    family: "Qwen Audio",
    modality: "audio",
    domainTags: ["speech-to-text", "audio"],
    apiType: "saas",
    contextWindow: 0,
    costPer1kTokens: 0,
    latencyMs: 0,
    license: "open",
    source: "alibaba-docs",
    url: "https://qwenlm.github.io/",
  
    pros: [
      "Audio understanding capabilities",
    ],
    cons: [
      "Less mature than text models",
    ],
    ragTips: [
      "Transcribe → clean → chunk before embedding",
    ],
    typicalUseCases: [
      "Audio transcription",
      "Voice assistant preprocessing",
    ],
    strengths: [
      "Audio input support",
    ],
    limitations: [
      "Not optimized for large-scale reasoning",
    ],
  },

  //=========================
  //QWEN EMBEDDINGS
  //=========================

  {
    id: "qwen-embedding",
    name: "Qwen Embedding",
    provider: "Alibaba",
    family: "Qwen",
    modality: "text",
    domainTags: ["embeddings", "semantic-search", "rag"],
    apiType: "saas",
    contextWindow: 8192,
    costPer1kTokens: 0,
    latencyMs: 0,
    license: "open",
    source: "alibaba-docs",
    url: "https://qwenlm.github.io/",
  
    pros: [
      "Open-weight embeddings",
      "Good multilingual support",
    ],
    cons: [
      "Embeddings only",
    ],
    ragTips: [
      "Use consistent chunk sizes",
    ],
    typicalUseCases: [
      "Vector search",
      "Clustering",
      "RAG retrieval",
    ],
    strengths: [
      "Multilingual embeddings",
    ],
    limitations: [
      "No generation capability",
    ],
  },

  //ollama
  {
    id: "llama-3.1-405b",
    name: "LLaMA 3.1 405B",
    provider: "Meta",
    family: "LLaMA 3.1",
    modality: "text",
    domainTags: ["flagship", "reasoning", "open-weight"],
    apiType: "self-hosted",
    contextWindow: 128000,
    costPer1kTokens: 0,
    latencyMs: 0,
    license: "open",
    source: "meta",
    url: "https://ai.meta.com/llama/",
  
    pros: [
      "Largest open-weight model from Meta",
      "Strong reasoning and knowledge coverage",
    ],
    cons: [
      "Extremely heavy infrastructure requirements",
    ],
    ragTips: [
      "Use semantic chunking with high-quality reranking",
    ],
    typicalUseCases: [
      "Enterprise private deployments",
      "Advanced RAG systems",
    ],
    strengths: [
      "Reasoning depth",
      "Open-weight control",
    ],
    limitations: [
      "High compute cost",
    ],
  },

  {
    id: "llama-3.1-70b",
    name: "LLaMA 3.1 70B",
    provider: "Meta",
    family: "LLaMA 3.1",
    modality: "text",
    domainTags: ["open-weight", "balanced"],
    apiType: "self-hosted",
    contextWindow: 128000,
    costPer1kTokens: 0,
    latencyMs: 0,
    license: "open",
    source: "meta",
    url: "https://ai.meta.com/llama/",
  
    pros: [
      "Strong performance for size",
      "Widely adopted in production",
    ],
    cons: [
      "Requires GPU infrastructure",
    ],
    ragTips: [
      "Quantize for inference (4-bit/8-bit)",
    ],
    typicalUseCases: [
      "Private RAG deployments",
      "Internal enterprise assistants",
    ],
    strengths: [
      "Performance per compute",
    ],
    limitations: [
      "Text-only",
    ],
  },

  {
    id: "llama-3.1-8b",
    name: "LLaMA 3.1 8B",
    provider: "Meta",
    family: "LLaMA 3.1",
    modality: "text",
    domainTags: ["efficient", "edge", "open-weight"],
    apiType: "self-hosted",
    contextWindow: 128000,
    costPer1kTokens: 0,
    latencyMs: 0,
    license: "open",
    source: "meta",
    url: "https://ai.meta.com/llama/",
  
    pros: [
      "Lightweight compared to 70B",
      "Great for local deployment",
    ],
    cons: [
      "Lower ceiling than 70B/405B",
    ],
    ragTips: [
      "Keep prompts structured and retrieval tight",
    ],
    typicalUseCases: [
      "Local assistants",
      "Edge deployment",
    ],
    strengths: [
      "Efficiency",
    ],
    limitations: [
      "Not ideal for complex multi-step reasoning",
    ],
  },

  {
    id: "llama-3-70b",
    name: "LLaMA 3 70B",
    provider: "Meta",
    family: "LLaMA 3",
    modality: "text",
    domainTags: ["open-weight", "balanced"],
    apiType: "self-hosted",
    contextWindow: 8192,
    costPer1kTokens: 0,
    latencyMs: 0,
    license: "open",
    source: "meta",
    url: "https://ai.meta.com/llama/",
    pros: ["Strong open-weight baseline"],
    cons: ["Shorter context than 3.1"],
    ragTips: ["Use chunk compression"],
    typicalUseCases: ["Private chatbots"],
    strengths: ["Reliable performance"],
    limitations: ["Shorter context window"],
  },

  {
    id: "llama-3.2-11b-vision",
    name: "LLaMA 3.2 11B Vision",
    provider: "Meta",
    family: "LLaMA 3.2",
    modality: "multimodal",
    domainTags: ["vision", "open-weight"],
    apiType: "self-hosted",
    contextWindow: 128000,
    costPer1kTokens: 0,
    latencyMs: 0,
    license: "open",
    source: "meta",
    url: "https://ai.meta.com/llama/",
    pros: ["Image + text reasoning"],
    cons: ["Smaller model size"],
    ragTips: ["Attach image captions as metadata"],
    typicalUseCases: ["Vision Q&A", "Document analysis"],
    strengths: ["Multimodal"],
    limitations: ["Not state-of-the-art vs proprietary vision models"],
  },

  //=========================
  //DEEPSEEK — GENERAL
  //=========================

  {
    id: "deepseek-v3",
    name: "DeepSeek V3",
    provider: "DeepSeek",
    family: "DeepSeek V3",
    modality: "text",
    domainTags: ["general", "reasoning", "open-weight"],
    apiType: "self-hosted",
    contextWindow: 128000,
    costPer1kTokens: 0,
    latencyMs: 0,
    license: "open",
    source: "deepseek-docs",
    url: "https://www.deepseek.com/",
  
    pros: [
      "Strong open-weight flagship model",
      "Competitive reasoning performance",
      "Large context window",
    ],
    cons: [
      "High infrastructure requirements for full-size variant",
    ],
    ragTips: [
      "Use structured prompts for multi-step reasoning",
      "Combine with reranking for higher retrieval precision",
    ],
    typicalUseCases: [
      "Enterprise RAG",
      "Private assistants",
      "General-purpose LLM tasks",
    ],
    strengths: [
      "Reasoning depth",
      "Open-weight flexibility",
    ],
    limitations: [
      "Text-only",
    ],
  },

  //=========================
  //DEEPSEEK — REASONING
  //=========================

  {
    id: "deepseek-r1",
    name: "DeepSeek R1",
    provider: "DeepSeek",
    family: "DeepSeek R1",
    modality: "text",
    domainTags: ["reasoning", "math", "chain-of-thought", "open-weight"],
    apiType: "self-hosted",
    contextWindow: 128000,
    costPer1kTokens: 0,
    latencyMs: 0,
    license: "open",
    source: "deepseek-docs",
    url: "https://www.deepseek.com/",
  
    pros: [
      "Explicit reasoning optimization",
      "Strong performance on math and logic tasks",
    ],
    cons: [
      "Higher latency due to reasoning steps",
    ],
    ragTips: [
      "Best used when step-by-step reasoning is required",
    ],
    typicalUseCases: [
      "Math solving",
      "Logical analysis",
      "Complex planning",
    ],
    strengths: [
      "Structured reasoning capability",
    ],
    limitations: [
      "Text-only",
    ],
  },

  //=========================
  //DEEPSEEK — CODER
  //=========================

  {
    id: "deepseek-coder-v2",
    name: "DeepSeek Coder V2",
    provider: "DeepSeek",
    family: "DeepSeek Coder",
    modality: "text",
    domainTags: ["coding", "code-completion", "open-weight"],
    apiType: "self-hosted",
    contextWindow: 128000,
    costPer1kTokens: 0,
    latencyMs: 0,
    license: "open",
    source: "deepseek-docs",
    url: "https://www.deepseek.com/",
  
    pros: [
      "Optimized for code generation",
      "Strong multilingual code support",
    ],
    cons: [
      "Less suited for general reasoning tasks",
    ],
    ragTips: [
      "Use repository indexing + embedding retrieval",
    ],
    typicalUseCases: [
      "IDE copilots",
      "Code explanation",
      "Software engineering agents",
    ],
    strengths: [
      "Code reasoning",
    ],
    limitations: [
      "Text-only",
    ],
  },

  //=========================
  //DEEPSEEK — VISION
  //=========================

  {
    id: "deepseek-vl2",
    name: "DeepSeek VL2",
    provider: "DeepSeek",
    family: "DeepSeek VL",
    modality: "multimodal",
    domainTags: ["vision", "multimodal", "open-weight"],
    apiType: "self-hosted",
    contextWindow: 128000,
    costPer1kTokens: 0,
    latencyMs: 0,
    license: "open",
    source: "deepseek-docs",
    url: "https://www.deepseek.com/",
  
    pros: [
      "Image + text understanding",
      "Open-weight multimodal model",
    ],
    cons: [
      "Requires significant compute resources",
    ],
    ragTips: [
      "Store image captions and metadata for retrieval pipelines",
    ],
    typicalUseCases: [
      "Document analysis",
      "Chart/diagram reasoning",
      "Vision Q&A",
    ],
    strengths: [
      "Multimodal reasoning",
    ],
    limitations: [
      "No native audio support",
    ],
  },

  //=========================
  //xAI — GROK MODELS
  //=========================

  {
    id: "grok-2",
    name: "Grok-2",
    provider: "xAI",
    family: "Grok",
    modality: "multimodal",
    domainTags: ["reasoning", "realtime", "social", "vision"],
    apiType: "saas",
    contextWindow: 128000,
    costPer1kTokens: 0,
    latencyMs: 0,
    license: "proprietary",
    source: "xai-docs",
    url: "https://x.ai/",
  
    pros: [
      "Flagship xAI model",
      "Strong reasoning and coding",
      "Vision capabilities",
      "Designed for real-time knowledge integration",
    ],
    cons: [
      "Proprietary",
      "Less mature ecosystem than OpenAI/Anthropic",
    ],
    ragTips: [
      "Use with live data connectors for dynamic knowledge tasks",
      "Add retrieval grounding for enterprise use cases",
    ],
    typicalUseCases: [
      "Realtime assistants",
      "Social media analysis",
      "General-purpose chat",
      "Vision Q&A",
    ],
    strengths: [
      "Realtime context alignment",
      "Multimodal reasoning",
    ],
    limitations: [
      "Requires hosted API access",
    ],
  },

  {
    id: "grok-2-mini",
    name: "Grok-2 Mini",
    provider: "xAI",
    family: "Grok",
    modality: "text",
    domainTags: ["efficient", "chat", "realtime"],
    apiType: "saas",
    contextWindow: 128000,
    costPer1kTokens: 0,
    latencyMs: 0,
    license: "proprietary",
    source: "xai-docs",
    url: "https://x.ai/",
  
    pros: [
      "Faster and lighter than Grok-2",
      "Cost-efficient for high-volume tasks",
    ],
    cons: [
      "Lower reasoning ceiling",
    ],
    ragTips: [
      "Use for high-throughput chat and summarization",
    ],
    typicalUseCases: [
      "Customer support",
      "Lightweight assistants",
    ],
    strengths: [
      "Speed",
      "Throughput",
    ],
    limitations: [
      "Text-only",
    ],
  },

  {
    id: "grok-1.5",
    name: "Grok-1.5",
    provider: "xAI",
    family: "Grok",
    modality: "text",
    domainTags: ["reasoning", "long-context"],
    apiType: "saas",
    contextWindow: 128000,
    costPer1kTokens: 0,
    latencyMs: 0,
    license: "proprietary",
    source: "xai-docs",
    url: "https://x.ai/",
  
    pros: [
      "Strong reasoning performance",
      "Long context window",
    ],
    cons: [
      "Older generation compared to Grok-2",
    ],
    ragTips: [
      "Use structured prompts for long-document analysis",
    ],
    typicalUseCases: [
      "Long-form analysis",
      "Enterprise Q&A",
    ],
    strengths: [
      "Long-context reasoning",
    ],
    limitations: [
      "No multimodal capability",
    ],
  },

  {
    id: "grok-1.5-vision",
    name: "Grok-1.5 Vision",
    provider: "xAI",
    family: "Grok",
    modality: "multimodal",
    domainTags: ["vision", "multimodal"],
    apiType: "saas",
    contextWindow: 128000,
    costPer1kTokens: 0,
    latencyMs: 0,
    license: "proprietary",
    source: "xai-docs",
    url: "https://x.ai/",
  
    pros: [
      "Image + text understanding",
      "Strong document and diagram analysis",
    ],
    cons: [
      "Older than Grok-2 Vision capabilities",
    ],
    ragTips: [
      "Combine image captions with metadata for retrieval",
    ],
    typicalUseCases: [
      "Chart analysis",
      "Vision Q&A",
    ],
    strengths: [
      "Multimodal reasoning",
    ],
    limitations: [
      "Requires hosted API",
    ],
  },

  //nvidia 

  {
    id: "nemotron-4-340b-instruct",
    name: "Nemotron-4 340B Instruct",
    provider: "NVIDIA",
    family: "Nemotron 4",
    modality: "text",
    domainTags: ["general", "instruction-following", "synthetic-data", "open-weights"],
    apiType: "self-hosted",
    contextWindow: 4096,
    costPer1kTokens: 0,
    latencyMs: 0,
    license: "open",
    source: "nvidia",
    url: "https://huggingface.co/nvidia/Nemotron-4-340B-Instruct",
  
    pros: [
      "Open-weight 340B class model",
      "Strong for instruction-following + synthetic data generation",
    ],
    cons: [
      "Very high infrastructure requirements",
      "Shorter default context (4K) than modern long-context models",
    ],
    ragTips: [
      "Use tight retrieval + reranking; keep chunks high-signal",
    ],
    typicalUseCases: [
      "Synthetic data generation pipelines",
      "Private enterprise chat assistants",
      "Instruction-following tasks",
    ],
    strengths: ["Scale", "Instruction following"],
    limitations: ["Text-only", "Default context is 4K"],
  },
  
  {
    id: "nemotron-4-340b-instruct-128k",
    name: "Nemotron-4 340B Instruct 128K",
    provider: "NVIDIA",
    family: "Nemotron 4",
    modality: "text",
    domainTags: ["long-context", "reasoning", "agents", "open-weights"],
    apiType: "self-hosted",
    contextWindow: 128000,
    costPer1kTokens: 0,
    latencyMs: 0,
    license: "open",
    source: "nvidia-nim",
    url: "https://docs.nvidia.com/nim/large-language-models/1.2.0/models.html",
  
    pros: [
      "Long-context Nemotron 4 variant (128K)",
      "Optimized packaging via NVIDIA NIM",
    ],
    cons: [
      "Deployment complexity (NIM stack / GPU infra)",
    ],
    ragTips: [
      "Chunk less aggressively; prefer semantic sections",
      "Use citations/grounding for long-doc QA",
    ],
    typicalUseCases: [
      "Long-document assistants",
      "Enterprise RAG over large knowledge bases",
      "Agent workflows needing long context",
    ],
    strengths: ["Long-context analysis"],
    limitations: ["Text-only", "Operational overhead"],
  },
  
  {
    id: "nemotron-4-340b-reward",
    name: "Nemotron-4 340B Reward",
    provider: "NVIDIA",
    family: "Nemotron 4",
    modality: "text",
    domainTags: ["reward-model", "alignment", "judge", "open-weights"],
    apiType: "self-hosted",
    contextWindow: 4096,
    costPer1kTokens: 0,
    latencyMs: 0,
    license: "open",
    source: "nvidia",
    url: "https://huggingface.co/nvidia/Nemotron-4-340B-Reward",
  
    pros: [
      "Reward model useful for preference ranking / filtering",
      "Good for RLAIF / quality scoring pipelines",
    ],
    cons: [
      "Not a chat/generation model",
      "Optimized for English",
    ],
    ragTips: [
      "Use as a reranking/judge stage after candidate generations",
    ],
    typicalUseCases: [
      "Response scoring (judge)",
      "Synthetic data filtering",
      "Alignment pipelines",
    ],
    strengths: ["Evaluation + preference scoring"],
    limitations: ["Not for direct generation", "English-optimized"],
  },
  
  {
    id: "nvidia-nemotron-nano-9b-v2",
    name: "NVIDIA Nemotron Nano 9B v2",
    provider: "NVIDIA",
    family: "Nemotron Nano",
    modality: "text",
    domainTags: ["efficient", "reasoning", "agents", "open-weights"],
    apiType: "self-hosted",
    contextWindow: 128000,
    costPer1kTokens: 0,
    latencyMs: 0,
    license: "open",
    source: "nvidia",
    url: "https://build.nvidia.com/nvidia/nvidia-nemotron-nano-9b-v2/modelcard",
  
    pros: [
      "Much more lightweight than 340B-class models",
      "Designed for reasoning + agentic tasks",
      "Long context (128K)",
    ],
    cons: [
      "Lower ceiling vs large frontier models",
    ],
    ragTips: [
      "Quantize for inference; use strong retrieval + reranking",
    ],
    typicalUseCases: [
      "Local/edge-ish deployments (GPU required)",
      "High-throughput RAG Q&A",
      "Agent systems needing efficiency",
    ],
    strengths: ["Efficiency", "Reasoning-friendly"],
    limitations: ["Text-only"],
  },
  
  {
    id: "nemotron-3-nano-30b-a3b",
    name: "Nemotron 3 Nano 30B A3B",
    provider: "NVIDIA",
    family: "Nemotron 3",
    modality: "text",
    domainTags: ["long-context", "moe", "coding", "reasoning", "open-weights"],
    apiType: "self-hosted",
    contextWindow: 1000000,
    costPer1kTokens: 0,
    latencyMs: 0,
    license: "open",
    source: "nvidia",
    url: "https://build.nvidia.com/nvidia/nemotron-3-nano-30b-a3b/modelcard",
  
    pros: [
      "Long-context capable (up to 1M context)",
      "MoE architecture aimed at efficiency",
    ],
    cons: [
      "Practical deployments may use smaller default context due to VRAM",
    ],
    ragTips: [
      "Use long-context only when needed; otherwise run at 128K/256K for cost/latency",
    ],
    typicalUseCases: [
      "Very long document / log / codebase analysis",
      "Agent workflows requiring long scratch context",
    ],
    strengths: ["Extreme context length", "Efficiency via MoE"],
    limitations: ["Text-only", "Long context can be expensive in VRAM/latency"],
  },

  //amazon 
  //=========================
  //AMAZON — NOVA (NEW GENERATION)
  //=========================

  {
    id: "amazon-nova-pro",
    name: "Amazon Nova Pro",
    provider: "Amazon",
    family: "Nova",
    modality: "multimodal",
    domainTags: ["reasoning", "enterprise", "vision"],
    apiType: "saas",
    contextWindow: 200000,
    costPer1kTokens: 0,
    latencyMs: 0,
    license: "proprietary",
    source: "aws-bedrock-docs",
    url: "https://aws.amazon.com/bedrock/",
  
    pros: [
      "Frontier Amazon model",
      "Strong reasoning and multimodal capabilities",
      "Designed for enterprise deployment",
    ],
    cons: [
      "Bedrock ecosystem required",
    ],
    ragTips: [
      "Use Bedrock RAG pipelines with embeddings + rerank",
      "Keep structured retrieval for compliance-heavy workflows",
    ],
    typicalUseCases: [
      "Enterprise assistants",
      "Document + image analysis",
      "Agentic workflows",
    ],
    strengths: [
      "Enterprise integration",
      "Multimodal reasoning",
    ],
    limitations: [
      "AWS ecosystem dependency",
    ],
  },

  {
    id: "amazon-nova-lite",
    name: "Amazon Nova Lite",
    provider: "Amazon",
    family: "Nova",
    modality: "multimodal",
    domainTags: ["balanced", "enterprise"],
    apiType: "saas",
    contextWindow: 200000,
    costPer1kTokens: 0,
    latencyMs: 0,
    license: "proprietary",
    source: "aws-bedrock-docs",
    url: "https://aws.amazon.com/bedrock/",
  
    pros: [
      "Balanced performance and cost",
      "Enterprise-ready",
    ],
    cons: [
      "Lower reasoning ceiling than Nova Pro",
    ],
    ragTips: [
      "Use for production RAG at scale",
    ],
    typicalUseCases: [
      "Customer support",
      "Enterprise Q&A systems",
    ],
    strengths: [
      "Cost-performance balance",
    ],
    limitations: [
      "AWS Bedrock access required",
    ],
  },

  {
    id: "amazon-nova-micro",
    name: "Amazon Nova Micro",
    provider: "Amazon",
    family: "Nova",
    modality: "text",
    domainTags: ["efficient", "high-throughput"],
    apiType: "saas",
    contextWindow: 200000,
    costPer1kTokens: 0,
    latencyMs: 0,
    license: "proprietary",
    source: "aws-bedrock-docs",
    url: "https://aws.amazon.com/bedrock/",
  
    pros: [
      "Fastest Nova tier",
      "Cost-efficient for high-volume workloads",
    ],
    cons: [
      "Text-only",
      "Lower reasoning depth",
    ],
    ragTips: [
      "Use for routing, summarization, and lightweight extraction",
    ],
    typicalUseCases: [
      "Chat routing",
      "Summarization",
      "Intent detection",
    ],
    strengths: [
      "Speed",
    ],
    limitations: [
      "Not suited for complex multi-step reasoning",
    ],
  },

  //=========================
  //AMAZON — TITAN FAMILY
  //=========================

  {
    id: "amazon-titan-text-express",
    name: "Titan Text G1 Express",
    provider: "Amazon",
    family: "Titan",
    modality: "text",
    domainTags: ["general", "enterprise"],
    apiType: "saas",
    contextWindow: 8000,
    costPer1kTokens: 0,
    latencyMs: 0,
    license: "proprietary",
    source: "aws-bedrock-docs",
    url: "https://aws.amazon.com/bedrock/titan/",
  
    pros: [
      "Enterprise-focused text generation",
      "Stable Bedrock integration",
    ],
    cons: [
      "Shorter context than Nova models",
    ],
    ragTips: [
      "Use Titan Embeddings for retrieval layer",
    ],
    typicalUseCases: [
      "Enterprise chat",
      "Content generation",
    ],
    strengths: [
      "AWS integration",
    ],
    limitations: [
      "Text-only",
    ],
  },

  {
    id: "amazon-titan-embed-g1",
    name: "Titan Embeddings G1",
    provider: "Amazon",
    family: "Titan",
    modality: "text",
    domainTags: ["embeddings", "rag", "semantic-search"],
    apiType: "saas",
    contextWindow: 8000,
    costPer1kTokens: 0,
    latencyMs: 0,
    license: "proprietary",
    source: "aws-bedrock-docs",
    url: "https://aws.amazon.com/bedrock/titan/",
  
    pros: [
      "Optimized for Bedrock RAG pipelines",
      "High-quality embeddings",
    ],
    cons: [
      "Embeddings only",
    ],
    ragTips: [
      "Use metadata filtering in Bedrock knowledge bases",
    ],
    typicalUseCases: [
      "Vector search",
      "RAG indexing",
    ],
    strengths: [
      "Enterprise semantic retrieval",
    ],
    limitations: [
      "No generation capability",
    ],
  },

  {
    id: "amazon-titan-multimodal-embed",
    name: "Titan Multimodal Embeddings",
    provider: "Amazon",
    family: "Titan",
    modality: "multimodal",
    domainTags: ["embeddings", "image", "rag"],
    apiType: "saas",
    contextWindow: 8000,
    costPer1kTokens: 0,
    latencyMs: 0,
    license: "proprietary",
    source: "aws-bedrock-docs",
    url: "https://aws.amazon.com/bedrock/titan/",
  
    pros: [
      "Supports text + image embeddings",
      "Designed for multimodal search systems",
    ],
    cons: [
      "Embeddings only",
    ],
    ragTips: [
      "Store image captions + metadata for better retrieval",
    ],
    typicalUseCases: [
      "Image search",
      "Multimodal RAG",
    ],
    strengths: [
      "Multimodal retrieval",
    ],
    limitations: [
      "Requires Bedrock vector infrastructure",
    ],
  },



];

function asJsonArray(arr: string[]): Prisma.InputJsonValue {
  return arr as unknown as Prisma.InputJsonValue;
}

async function main() {
  for (const m of models) {
    // normalize + enrich tags
    const finalTags = enrichTags(m);

    await prisma.modelProfile.upsert({
      where: { id: m.id },
      update: {
        name: m.name,
        provider: m.provider,
        family: m.family,
        modality: m.modality,
        apiType: m.apiType,
        contextWindow: m.contextWindow,
        costPer1kTokens: m.costPer1kTokens,
        latencyMs: m.latencyMs,
        license: m.license,
        source: m.source,
        url: m.url,

        //changed
        domainTags: asJsonArray(finalTags),

        pros: asJsonArray(m.pros),
        cons: asJsonArray(m.cons),
        ragTips: asJsonArray(m.ragTips),
        typicalUseCases: asJsonArray(m.typicalUseCases),
        strengths: asJsonArray(m.strengths),
        limitations: asJsonArray(m.limitations),
      },
      create: {
        id: m.id,
        name: m.name,
        provider: m.provider,
        family: m.family,
        modality: m.modality,
        apiType: m.apiType,
        contextWindow: m.contextWindow,
        costPer1kTokens: m.costPer1kTokens,
        latencyMs: m.latencyMs,
        license: m.license,
        source: m.source,
        url: m.url,

        // changed
        domainTags: asJsonArray(finalTags),

        pros: asJsonArray(m.pros),
        cons: asJsonArray(m.cons),
        ragTips: asJsonArray(m.ragTips),
        typicalUseCases: asJsonArray(m.typicalUseCases),
        strengths: asJsonArray(m.strengths),
        limitations: asJsonArray(m.limitations),
      },
    });
  }

  const count = await prisma.modelProfile.count();
  console.log(`Seed complete. ModelProfile rows = ${count}`);
}

main()
  .catch((e) => {
    console.error(" seedModels.ts failed:", e);
    throw new Error('Seeding failed')
  })
  .finally(async () => {
    await prisma.$disconnect();
  });