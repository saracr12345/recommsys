// Enhanced Tracker Page - Premium UI with Interactive Green-Themed Cards
import * as React from "react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  SearchIcon,
  RefreshCwIcon,
  StarIcon,
  ExternalLinkIcon,
  CheckCircle2Icon,
  CircleIcon,
  FilterIcon,
  TagIcon,
  TrendingUpIcon,
  XIcon,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

/* ---------- localStorage + helpers ---------- */

const STORAGE_KEYS = {
  KEYWORDS: "llmtech.keywords.v1",
  READ: "llmtech.read.v1",
  FAV: "llmtech.fav.v1",
  PREFS: "llmtech.prefs.v1",
};

const defaultKeywords = [
  "RAG",
  "distillation",
  "quantization",
  "agent",
  "reasoning",
  "multimodal",
  "benchmark",
  "inference",
  "training",
  "speculative decoding",
  "LoRA",
  "QLoRA",
  "tool use",
  "memory",
  "long context",
  "mixture of experts",
  "safety",
  "alignment",
];

function saveLocal(key: string, val: any) {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch {}
}

function loadLocal<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
}

function timeSince(dateStr?: string) {
  const d = new Date(dateStr || "");
  if (Number.isNaN(d.getTime())) return "";
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return `${Math.floor(diff)}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return d.toLocaleDateString();
}

function useDebounced<T>(value: T, delay = 300) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

function stripHtml(html: string) {
  const div = document.createElement("div");
  div.innerHTML = html;
  return (div.textContent || div.innerText || "").trim();
}

function highlightKeywords(text: string, kwsLower: string[]) {
  if (!text) return text;

  const lower = text.toLowerCase();
  const ranges: Array<[number, number]> = [];

  for (const k of kwsLower) {
    if (!k) continue;
    let idx = 0;
    while (true) {
      idx = lower.indexOf(k, idx);
      if (idx === -1) break;
      ranges.push([idx, idx + k.length]);
      idx += k.length;
    }
  }

  if (!ranges.length) return text;

  ranges.sort((a, b) => a[0] - b[0]);
  const merged: Array<[number, number]> = [];
  for (const [s, e] of ranges) {
    if (!merged.length || s > merged[merged.length - 1][1]) merged.push([s, e]);
    else merged[merged.length - 1][1] = Math.max(merged[merged.length - 1][1], e);
  }

  const parts: React.ReactNode[] = [];
  let prev = 0;
  merged.forEach(([s, e], i) => {
    if (s > prev) parts.push(text.slice(prev, s));
    parts.push(
      <mark
        key={i}
        className="rounded-md bg-emerald-200/70 px-1.5 py-0.5 text-foreground font-medium"
      >
        {text.slice(s, e)}
      </mark>
    );
    prev = e;
  });
  if (prev < text.length) parts.push(text.slice(prev));

  return <>{parts}</>;
}

/* ---------- types ---------- */

type Prefs = {
  tab: "all" | "paper" | "blog";
  sort: "newest" | "oldest" | "relevance";
  onlyKeywordMatches: boolean;
  showSummaries: boolean;
  onlyFavorites: boolean;
};

type FeedItem = {
  id: string;
  title: string;
  summary?: string;
  date?: string;
  link?: string;
  author?: string;
  source?: string;
  type?: "paper" | "blog" | string;
};

/* ---------- page ---------- */

export default function EnhancedTrackerPage() {
  const [keywords, setKeywords] = useState<string[]>(() =>
    loadLocal(STORAGE_KEYS.KEYWORDS, defaultKeywords)
  );
  const [readIds, setReadIds] = useState<Record<string, boolean>>(() =>
    loadLocal(STORAGE_KEYS.READ, {})
  );
  const [favIds, setFavIds] = useState<Record<string, boolean>>(() =>
    loadLocal(STORAGE_KEYS.FAV, {})
  );
  const [prefs, setPrefs] = useState<Prefs>(() =>
    loadLocal(STORAGE_KEYS.PREFS, {
      tab: "all",
      sort: "newest",
      onlyKeywordMatches: true,
      showSummaries: true,
      onlyFavorites: false,
    })
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [entries, setEntries] = useState<FeedItem[]>([]);
  const [q, setQ] = useState("");
  const qDebounced = useDebounced(q, 250);

  const [newKeyword, setNewKeyword] = useState("");
  const [activeKws, setActiveKws] = useState<string[]>([]);
  const [financeTrends, setFinanceTrends] = useState<
    Array<{ term: string; change: number; now: number; prev: number }>
  >([]);

  const lastRefreshedRef = useRef<Date | null>(null);

  useEffect(() => saveLocal(STORAGE_KEYS.KEYWORDS, keywords), [keywords]);
  useEffect(() => saveLocal(STORAGE_KEYS.READ, readIds), [readIds]);
  useEffect(() => saveLocal(STORAGE_KEYS.FAV, favIds), [favIds]);
  useEffect(() => saveLocal(STORAGE_KEYS.PREFS, prefs), [prefs]);

  async function refreshFeeds() {
    setLoading(true);
    setError("");
    try {
      const r = await fetch("http://localhost:8787/feeds", { cache: "no-store" });
      if (!r.ok) throw new Error("feeds failed");
      const items = (await r.json()) as FeedItem[];

      const sorted = [...items].sort((a, b) => {
        const da = new Date(a.date || "").getTime() || 0;
        const db = new Date(b.date || "").getTime() || 0;
        return prefs.sort === "oldest" ? da - db : db - da;
      });

      setEntries(sorted);
      lastRefreshedRef.current = new Date();
    } catch {
      setError("Failed to fetch feeds (server). Try again later.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refreshFeeds();
  }, []);

  // Finance trend detection...
  useEffect(() => {
    if (!entries.length) {
      setFinanceTrends([]);
      return;
    }

    const financeTerms = [
      "finance",
      "financial",
      "stocks",
      "market",
      "portfolio",
      "trading",
      "sentiment",
      "earnings",
      "bank",
      "macro",
      "inflation",
      "risk",
      "credit",
      "bond",
    ];

    const now = Date.now();
    const day = 24 * 3600 * 1000;
    const w1 = now - 7 * day;
    const w2 = now - 14 * day;

    const score = (start: number, end: number) => {
      const counts: Record<string, number> = {};
      for (const it of entries) {
        const t = new Date(it.date || "").getTime();
        if (!t || t < end || t >= start) continue;
        const text = `${it.title} ${it.summary || ""}`.toLowerCase();
        for (const term of financeTerms) {
          if (text.includes(term)) counts[term] = (counts[term] || 0) + 1;
        }
      }
      return counts;
    };

    const prev = score(w2, w1);
    const cur = score(now, w1);

    const merged = Array.from(new Set([...Object.keys(prev), ...Object.keys(cur)]))
      .map((term) => ({
        term,
        prev: prev[term] || 0,
        now: cur[term] || 0,
        change: (cur[term] || 0) - (prev[term] || 0),
      }))
      .sort((a, b) => b.change - a.change || b.now - a.now)
      .slice(0, 8);

    setFinanceTrends(merged);
  }, [entries]);

  const kwLower = useMemo(() => keywords.map((k) => k.toLowerCase()), [keywords]);

  const filtered = useMemo(() => {
    const ql = (qDebounced || "").trim().toLowerCase();
    const baseKw = (activeKws.length ? activeKws : keywords).map((k) => k.toLowerCase());
    const kwSet = new Set(baseKw);

    let arr = entries.filter((e) => {
      if (prefs.onlyFavorites && !favIds[e.id]) return false;
      if (prefs.tab !== "all" && e.type !== prefs.tab) return false;

      const t = `${e.title} ${e.summary || ""} ${e.author || ""} ${e.source || ""}`.toLowerCase();
      if (ql && !t.includes(ql)) return false;

      if (prefs.onlyKeywordMatches) {
        const hasKw = Array.from(kwSet).some((k) => t.includes(k));
        if (!hasKw) return false;
      }

      return true;
    });

    if (prefs.sort === "relevance") {
      arr = arr
        .map((e) => {
          const t = `${e.title} ${e.summary || ""}`.toLowerCase();
          let score = 0;

          for (const k of baseKw) {
            let idx = 0;
            while (true) {
              idx = t.indexOf(k, idx);
              if (idx === -1) break;
              score += 1;
              idx += k.length;
            }
          }

          if (ql) {
            let idx = 0;
            while (true) {
              idx = t.indexOf(ql, idx);
              if (idx === -1) break;
              score += 0.5;
              idx += ql.length;
            }
          }

          return { e, score };
        })
        .sort((a, b) => b.score - a.score)
        .map((x) => x.e);
    }

    return arr;
  }, [
    entries,
    favIds,
    prefs.tab,
    prefs.onlyFavorites,
    qDebounced,
    prefs.onlyKeywordMatches,
    prefs.sort,
    keywords,
    activeKws,
  ]);

  function toggleRead(id: string) {
    setReadIds((prev) => ({ ...prev, [id]: !prev[id] }));
  }
  function toggleFav(id: string) {
    setFavIds((prev) => ({ ...prev, [id]: !prev[id] }));
  }
  function addKeyword(k: string) {
    const key = (k || "").trim();
    if (!key || keywords.includes(key)) return;
    setKeywords([...keywords, key]);
    setNewKeyword("");
  }
  function removeKeyword(k: string) {
    setKeywords(keywords.filter((x) => x !== k));
    setActiveKws(activeKws.filter((x) => x !== k));
  }
  function toggleActiveKw(k: string) {
    setActiveKws(activeKws.includes(k) ? activeKws.filter((x) => x !== k) : [...activeKws, k]);
  }
  function clearActiveKws() {
    setActiveKws([]);
  }

  const lastRefreshed = lastRefreshedRef.current;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50/30 to-slate-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-emerald-600 to-emerald-700 bg-clip-text text-transparent">
                Feed Tracker
              </h1>
              <p className="mt-2 text-slate-600">Track and organize your research feeds with intelligent keyword matching</p>
            </div>
            <Button
              onClick={refreshFeeds}
              disabled={loading}
              className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <RefreshCwIcon className={cn("size-4", loading && "animate-spin")} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mb-8">
          <div className="relative">
            <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search feeds, keywords, authors..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* LEFT SIDEBAR */}
          <aside className="lg:col-span-3 space-y-6">
            {/* Filters Card */}
            <Card className="border-slate-200 shadow-sm hover:shadow-md transition-shadow bg-white/80 backdrop-blur-sm">
              <CardHeader className="space-y-2">
                <CardTitle className="flex items-center gap-2 text-emerald-700">
                  <FilterIcon className="size-5" />
                  Filters
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Tab Filter */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Content Type</label>
                  <Tabs
                    value={prefs.tab}
                    onValueChange={(v) => setPrefs({ ...prefs, tab: v as any })}
                    className="w-full"
                  >
                    <TabsList className="grid w-full grid-cols-3 bg-slate-100">
                      <TabsTrigger value="all">All</TabsTrigger>
                      <TabsTrigger value="paper">Papers</TabsTrigger>
                      <TabsTrigger value="blog">Blogs</TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>

                {/* Sort */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Sort By</label>
                  <select
                    value={prefs.sort}
                    onChange={(e) => setPrefs({ ...prefs, sort: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="newest">Newest First</option>
                    <option value="oldest">Oldest First</option>
                    <option value="relevance">Most Relevant</option>
                  </select>
                </div>

                {/* Toggles */}
                <div className="space-y-2">
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={prefs.onlyKeywordMatches}
                      onChange={(e) => setPrefs({ ...prefs, onlyKeywordMatches: e.target.checked })}
                      className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="text-sm text-slate-700 group-hover:text-slate-900">Only keyword matches</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={prefs.showSummaries}
                      onChange={(e) => setPrefs({ ...prefs, showSummaries: e.target.checked })}
                      className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="text-sm text-slate-700 group-hover:text-slate-900">Show summaries</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={prefs.onlyFavorites}
                      onChange={(e) => setPrefs({ ...prefs, onlyFavorites: e.target.checked })}
                      className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="text-sm text-slate-700 group-hover:text-slate-900">Favorites only</span>
                  </label>
                </div>
              </CardContent>
            </Card>

            {/* Keywords Card */}
            <Card className="border-slate-200 shadow-sm hover:shadow-md transition-shadow bg-white/80 backdrop-blur-sm">
              <CardHeader className="space-y-1">
                <CardTitle className="flex items-center gap-2 text-emerald-700">
                  <TagIcon className="size-5" />
                  Tracked Keywords
                </CardTitle>
                <CardDescription>Click to focus. Remove to stop tracking.</CardDescription>
              </CardHeader>

              <CardContent className="space-y-3">
                <div className="flex gap-2">
                  <input
                    className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                    placeholder="Add a keyword…"
                    value={newKeyword}
                    onChange={(e) => setNewKeyword(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") addKeyword(newKeyword);
                    }}
                  />
                  <Button
                    variant="outline"
                    onClick={() => addKeyword(newKeyword)}
                    className="border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700"
                  >
                    Add
                  </Button>
                </div>

                <div className="flex flex-wrap gap-2">
                  {keywords.map((k) => {
                    const selected = activeKws.includes(k);
                    return (
                      <button
                        key={k}
                        type="button"
                        onClick={() => toggleActiveKw(k)}
                        className={cn(
                          "group inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-all",
                          "hover:shadow-sm",
                          selected
                            ? "border-emerald-300 bg-emerald-50 text-emerald-700 shadow-sm"
                            : "border-slate-200 bg-white text-slate-700 hover:border-emerald-200 hover:bg-emerald-50/50"
                        )}
                      >
                        <span className="truncate">{k}</span>
                        <span
                          className="rounded-full p-0.5 text-slate-400 hover:text-slate-600 group-hover:text-emerald-600 transition-colors"
                          onClick={(ev) => {
                            ev.stopPropagation();
                            removeKeyword(k);
                          }}
                          title="Remove keyword"
                        >
                          <XIcon className="size-3" />
                        </span>
                      </button>
                    );
                  })}
                </div>

                {!!activeKws.length && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearActiveKws}
                    className="w-full text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                  >
                    Clear filters
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Stats Card */}
            <Card className="border-slate-200 shadow-sm bg-gradient-to-br from-emerald-50 to-emerald-50/50">
              <CardContent className="pt-6">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-600">Total Items</span>
                    <span className="text-2xl font-bold text-emerald-700">{entries.length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-600">Favorites</span>
                    <span className="text-lg font-semibold text-emerald-600">{Object.keys(favIds).length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-600">Read</span>
                    <span className="text-lg font-semibold text-emerald-600">{Object.keys(readIds).length}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </aside>

          {/* RIGHT MAIN CONTENT */}
          <main className="lg:col-span-9 space-y-6">
            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50/50 p-4 text-sm text-red-700 flex items-center gap-3">
                <div className="size-2 rounded-full bg-red-500" />
                {error}
              </div>
            )}

            {/* Feed Grid */}
            {loading ? (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-64 animate-pulse rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-100 to-slate-50"
                  />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {filtered.map((e) => (
                  <EnhancedFeedCard
                    key={e.id}
                    item={e}
                    read={!!readIds[e.id]}
                    fav={!!favIds[e.id]}
                    toggleRead={() => toggleRead(e.id)}
                    toggleFav={() => toggleFav(e.id)}
                    kwLower={kwLower}
                    showSummaries={prefs.showSummaries}
                  />
                ))}

                {!filtered.length && (
                  <div className="col-span-full">
                    <Card className="border-slate-200 bg-slate-50/50">
                      <CardContent className="py-12 text-center">
                        <Sparkles className="size-8 text-slate-300 mx-auto mb-3" />
                        <p className="text-sm text-slate-500">No items match your filters.</p>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </div>
            )}

            {/* Trends */}
            {!!financeTrends.length && (
              <Card className="border-slate-200 shadow-sm bg-white/80 backdrop-blur-sm">
                <CardHeader className="space-y-1">
                  <CardTitle className="flex items-center gap-2 text-emerald-700">
                    <TrendingUpIcon className="size-5" />
                    Finance Trends
                  </CardTitle>
                  <CardDescription>7d vs prior 7d mentions in your feed.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                    {financeTrends.map((t) => (
                      <div
                        key={t.term}
                        className="rounded-xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-4 hover:shadow-md transition-shadow"
                      >
                        <div className="text-sm font-semibold text-slate-900 capitalize">{t.term}</div>
                        <div className="mt-2 text-xs text-slate-500">
                          Now <span className="font-semibold text-slate-700">{t.now}</span> • Prev <span className="font-semibold text-slate-700">{t.prev}</span>
                        </div>
                        <div
                          className={cn(
                            "mt-3 flex items-center gap-1 text-sm font-bold",
                            t.change >= 0 ? "text-emerald-600" : "text-red-600"
                          )}
                        >
                          {t.change >= 0 ? (
                            <ArrowUpRight className="size-4" />
                          ) : (
                            <ArrowDownRight className="size-4" />
                          )}
                          {Math.abs(t.change)}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

/* ---------- Enhanced Feed Card Component ---------- */

function EnhancedFeedCard({
  item,
  read,
  fav,
  toggleRead,
  toggleFav,
  kwLower,
  showSummaries,
}: {
  item: FeedItem;
  read: boolean;
  fav: boolean;
  toggleRead: () => void;
  toggleFav: () => void;
  kwLower: string[];
  showSummaries: boolean;
}) {
  const title = item.title || "";
  const summary = item.summary ? stripHtml(item.summary) : "";
  const [isHovered, setIsHovered] = useState(false);

  return (
    <Card
      className={cn(
        "rounded-2xl border-slate-200 overflow-hidden transition-all duration-300",
        "hover:shadow-lg hover:border-emerald-300 hover:scale-105",
        "bg-gradient-to-br from-white to-slate-50",
        read && "opacity-75"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <CardContent className="pt-6">
        <div className="flex items-start justify-between gap-3">
          {/* Content */}
          <div className="min-w-0 flex-1">
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">
              {item.source || "Source"} • {timeSince(item.date)}
              {item.author ? ` • ${item.author}` : ""}
            </div>

            <div className="mt-3 line-clamp-2 text-lg font-bold text-slate-900 leading-tight">
              {highlightKeywords(title, kwLower)}
            </div>

            {showSummaries && summary && (
              <p className="mt-2 line-clamp-3 text-sm text-slate-600 leading-relaxed">
                {highlightKeywords(summary, kwLower)}
              </p>
            )}

            {/* Badges */}
            <div className="mt-4 flex flex-wrap gap-2">
              <Badge className="rounded-full bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition-colors">
                {item.type || "Feed"}
              </Badge>
              {fav && (
                <Badge className="rounded-full bg-amber-100 text-amber-700">
                  ⭐ Favorite
                </Badge>
              )}
              {read && (
                <Badge variant="outline" className="rounded-full border-emerald-200 text-emerald-700">
                  ✓ Read
                </Badge>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className={cn(
            "flex shrink-0 flex-col items-end gap-2 transition-all duration-300",
            isHovered ? "opacity-100" : "opacity-60"
          )}>
            <button
              type="button"
              onClick={toggleFav}
              className={cn(
                "rounded-full border px-3 py-2 text-xs font-medium transition-all duration-200",
                "hover:shadow-md",
                fav
                  ? "border-amber-300 bg-amber-50 text-amber-700"
                  : "border-slate-200 bg-white text-slate-700 hover:border-amber-200 hover:bg-amber-50"
              )}
              title="Favorite"
            >
              <StarIcon className={cn("mr-1 inline size-3.5", fav && "fill-current")} />
              {fav ? "Starred" : "Star"}
            </button>

            <button
              type="button"
              onClick={toggleRead}
              className={cn(
                "rounded-full border px-3 py-2 text-xs font-medium transition-all duration-200",
                "hover:shadow-md",
                read
                  ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                  : "border-slate-200 bg-white text-slate-700 hover:border-emerald-200 hover:bg-emerald-50"
              )}
              title="Mark read/unread"
            >
              {read ? (
                <>
                  <CheckCircle2Icon className="mr-1 inline size-3.5" />
                  Read
                </>
              ) : (
                <>
                  <CircleIcon className="mr-1 inline size-3.5" />
                  Unread
                </>
              )}
            </button>

            {item.link && (
              <a
                className={cn(
                  "rounded-full border px-3 py-2 text-xs font-medium transition-all duration-200",
                  "hover:shadow-md",
                  "border-slate-200 bg-white text-slate-700 hover:border-blue-200 hover:bg-blue-50"
                )}
                href={item.link}
                target="_blank"
                rel="noreferrer"
                title="Open original"
              >
                <ExternalLinkIcon className="mr-1 inline size-3.5" />
                Open
              </a>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
