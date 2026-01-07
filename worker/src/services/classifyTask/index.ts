import { taskProfile, type TaskProfile } from "../recommend/scoring.js";
import { classifyTaskWithOllama } from "./ollamaTaskClassifier.js";

export type ClassifiedProfile = TaskProfile & {
  isNonsense?: boolean;
  _meta?: {
    normalizedTask?: string;
    confidence?: number; // 0..1
    detectedTypos?: string[];
    rationale?: string[];
    source?: "ollama" | "fallback";
  };
};

function clamp01(x: number) {
  return Math.max(0, Math.min(1, x));
}

export async function classifyTask(taskRaw: string): Promise<ClassifiedProfile> {
  const task = String(taskRaw ?? "");

  try {
    const out = await classifyTaskWithOllama(task);

    const profile: TaskProfile = {
      finance: !!out.finance,
      type: out.type,
      highStakes: !!out.highStakes,
      longDoc: !!out.longDoc,
      subtype: out.subtype,
    };

    return {
      ...profile,
      isNonsense: !!out.isNonsense,
      _meta: {
        normalizedTask: out.normalizedTask,
        confidence: clamp01(Number(out.confidence) || 0.5),
        detectedTypos: out.detectedTypos ?? [],
        rationale: out.rationale ?? [],
        source: "ollama",
      },
    };
  } catch (e) {
    // fallback = heuristic keyword profile (never crash prod if Ollama is down)
    const fallback = taskProfile(task);

    return {
      ...fallback,
      isNonsense: false,
      _meta: {
        normalizedTask: task,
        confidence: 0.35,
        detectedTypos: [],
        rationale: ["Ollama unavailable; heuristic fallback classifier used."],
        source: "fallback",
      },
    };
  }
}
