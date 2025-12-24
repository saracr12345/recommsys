// worker/src/lib/recommend/scoring.ts

export function normLower(s: unknown) {
    return String(s ?? "").trim().toLowerCase();
  }
  
  export function clamp01(x: number) {
    return Math.max(0, Math.min(1, x));
  }
  
  export function isUnknownNumber(x: unknown) {
    const n = Number(x);
    return !Number.isFinite(n) || n <= 0;
  }
  
  // saturating bonus: 0..1, grows fast then flattens
  export function satBonus(x: number, k: number) {
    return 1 - Math.exp(-x / Math.max(1e-6, k));
  }
  
  export function jsonArrayToStringArray(value: unknown): string[] {
    return Array.isArray(value) ? value.map(String) : [];
  }
  
  export function tokenize(s: string): string[] {
    return s
      .toLowerCase()
      .split(/[^a-z0-9]+/g)
      .filter((t) => t.length >= 3);
  }
  
  export function jaccard(a: Set<string>, b: Set<string>) {
    let inter = 0;
    for (const x of a) if (b.has(x)) inter++;
    const union = a.size + b.size - inter;
    return union === 0 ? 0 : inter / union;
  }
  
  export type TaskProfile = {
    finance: boolean;
    type:
      | "extraction"
      | "sentiment"
      | "classification"
      | "summarization"
      | "qa_rag"
      | "coding"
      | "reasoning";
    highStakes: boolean;
    longDoc: boolean;
    subtype:
      | "filings"
      | "markets_news"
      | "risk"
      | "trading"
      | "compliance"
      | "general_finance"
      | "none";
  };
  
  export function taskProfile(task: string): TaskProfile {
    const t = normLower(task);
  
    const finance =
      /finance|market|stock|trading|risk|portfolio|hedge|sec|10-k|10q|earnings|filing|compliance|aml|kyc/i.test(
        t
      );
  
    const type: TaskProfile["type"] =
      /extract|parse|ner|isin|lei|ticker|table|json|schema|etl/i.test(t)
        ? "extraction"
        : /sentiment|bullish|bearish|tone/i.test(t)
        ? "sentiment"
        : /classif|label|categor/i.test(t)
        ? "classification"
        : /summar|tl;dr|brief/i.test(t)
        ? "summarization"
        : /rag|search|cite|sources|ground|retriev/i.test(t)
        ? "qa_rag"
        : /code|bug|typescript|python|sql|java|c\+\+|javascript/i.test(t)
        ? "coding"
        : "reasoning";
  
    const highStakes =
      finance &&
      /risk|compliance|aml|kyc|investment advice|recommendation|regulat/i.test(t);
  
    const longDoc =
      /10-k|10q|filing|prospectus|annual report|pdf|statement|balance sheet/i.test(
        t
      );
  
    let subtype: TaskProfile["subtype"] = "none";
    if (finance) {
      if (/10-k|10q|filing|sec|earnings|prospectus/i.test(t)) subtype = "filings";
      else if (/news|headline|macro|markets?/i.test(t)) subtype = "markets_news";
      else if (/var|stress|risk|exposure|hedge/i.test(t)) subtype = "risk";
      else if (/trading|execution|order|intraday|alpha/i.test(t)) subtype = "trading";
      else if (/aml|kyc|compliance|sanctions|policy/i.test(t)) subtype = "compliance";
      else subtype = "general_finance";
    }
  
    return { finance, type, highStakes, longDoc, subtype };
  }
  
  export function privacyAllows(privacy: string, apiType: string) {
    const p = normLower(privacy);
    const a = normLower(apiType);
  
    if (p === "any") return true;
    if (p.includes("self")) return a === "self-hosted" || a === "open-source";
    if (p.includes("cloud")) return a === "saas";
    return false;
  }
  
  export function modalityAllows(taskType: TaskProfile["type"], modality: string) {
    const m = normLower(modality);
  
    const textTask =
      taskType === "coding" ||
      taskType === "reasoning" ||
      taskType === "qa_rag" ||
      taskType === "summarization" ||
      taskType === "classification" ||
      taskType === "extraction" ||
      taskType === "sentiment";
  
    if (textTask) return m.includes("text"); // allows "text" and "text+image"
    return true;
  }
  
  export function buildDomainText(m: any) {
    const parts: string[] = [];
  
    for (const key of ["name", "family", "provider", "license", "source", "apiType"]) {
      if (m[key]) parts.push(String(m[key]));
    }
  
    for (const key of [
      "domainTags",
      "typicalUseCases",
      "strengths",
      "limitations",
      "pros",
      "cons",
    ]) {
      const v = m[key];
      if (Array.isArray(v)) parts.push(v.join(" "));
    }
  
    return parts.join(" ");
  }
  