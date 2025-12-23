// worker/scripts/seedModels.ts
import { PrismaClient, Prisma } from "@prisma/client";

console.log("🚀 seedModels.ts started");

const prisma = new PrismaClient();

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
    id: " ",
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
  
];

function asJsonArray(arr: string[]): Prisma.InputJsonValue {
  return arr as unknown as Prisma.InputJsonValue;
}

async function main() {
  for (const m of models) {
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

        domainTags: asJsonArray(m.domainTags),
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

        domainTags: asJsonArray(m.domainTags),
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
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
