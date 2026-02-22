import * as React from "react";
import {
  SearchIcon,
  PlusIcon,
  ImageIcon,
  BarChart3Icon,
  Link2Icon,
  Heart,
  MessageCircle,
  Share2,
  Bookmark,
  TrendingUp,
  Sparkles,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type Post = {
  id: string;
  author: string;
  handle: string;
  time: string;
  title: string;
  body: string;
  tags: string[];
  hasChart?: boolean;
  hasImages?: boolean;
  likes: number;
  replies: number;
};

const SEED_POSTS: Post[] = [
  {
    id: "1",
    author: "Sarah Chen",
    handle: "@sarah",
    time: "2h",
    title: "Jasper's new brand voice feature is a game changer",
    body:
      "I tested it for 3 hours. It's surprisingly good at picking up subtle tone nuances. Here's a quick comparison I ran.",
    tags: ["Tool Review", "Copywriting", "Brand Voice"],
    hasChart: true,
    likes: 342,
    replies: 28,
  },
  {
    id: "2",
    author: "David Miller",
    handle: "@david",
    time: "5h",
    title: "Consistent Character Generation Workflow",
    body:
      "Finally cracked a repeatable pipeline for consistent faces. Here's my seed strategy + prompt structure.",
    tags: ["Workflow", "Midjourney", "Prompting"],
    hasImages: true,
    likes: 521,
    replies: 45,
  },
];

const TRENDING_TOOLS = [
  { name: "Runway Gen-2", tag: "+3.1%" },
  { name: "UX Pilot", tag: "+2.8%" },
  { name: "Magnific AI", tag: "+1.9%" },
];

const TOP_PROMPTS = [
  {
    name: "Midjourney",
    desc: "Cinematic shot of a cyberpunk street food vendor, neon rain, 8k…",
  },
  {
    name: "VS Pixel",
    desc: "Act as a senior python developer. Code review the following…",
  },
  { name: "Web Pilot", desc: "Draft a product brief and landing copy for this…" },
];

type FeedTab = "for-you" | "following" | "trending" | "new";

function uid() {
  // Safari supports crypto.randomUUID, but keep a tiny fallback just in case
  // (also avoids crashing in some test environments)
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function CommunityFeedPage() {
  const [tab, setTab] = React.useState<FeedTab>("for-you");
  const [query, setQuery] = React.useState("");
  const [posts, setPosts] = React.useState<Post[]>(SEED_POSTS);

  const [likedPosts, setLikedPosts] = React.useState<Set<string>>(new Set());
  const [savedPosts, setSavedPosts] = React.useState<Set<string>>(new Set());

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return posts;

    return posts.filter((p) =>
      (p.title + " " + p.body + " " + p.tags.join(" "))
        .toLowerCase()
        .includes(q)
    );
  }, [posts, query]);

  const addPost = (p: Omit<Post, "id" | "time" | "likes" | "replies">) => {
    setPosts((prev) => [
      {
        ...p,
        id: uid(),
        time: "now",
        likes: 0,
        replies: 0,
      },
      ...prev,
    ]);
  };

  const toggleLike = (id: string) => {
    setLikedPosts((prev) => {
      const next = new Set(prev);
      const isLiked = next.has(id);
      if (isLiked) next.delete(id);
      else next.add(id);

      // Update the actual count on the post too
      setPosts((pPrev) =>
        pPrev.map((p) =>
          p.id === id
            ? { ...p, likes: Math.max(0, p.likes + (isLiked ? -1 : 1)) }
            : p
        )
      );

      return next;
    });
  };

  const toggleSave = (id: string) => {
    setSavedPosts((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="min-h-full bg-gradient-to-br from-slate-50 via-emerald-50/20 to-slate-50">
      <div className="mx-auto max-w-[1280px] px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="mb-6 flex items-center gap-3">
            <div className="rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 p-3 shadow-lg">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <h1 className="bg-gradient-to-r from-emerald-600 to-emerald-700 bg-clip-text text-4xl font-bold text-transparent">
              Community Hub
            </h1>
          </div>
          <p className="text-slate-600">
            Discover tools, share workflows, and connect with creators.
          </p>
        </div>

        {/* Search + Create */}
        <div className="mb-6 flex items-center gap-3">
          <div className="relative flex-1">
            <SearchIcon className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Find tools, prompts, people…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-12 pr-4 shadow-sm transition-all focus:border-transparent focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <CreatePostDialog onCreate={addPost} />
        </div>

        {/* Two columns layout */}
        <div className="grid grid-cols-12 gap-6">
          {/* MAIN FEED */}
          <div className="col-span-12 space-y-6 md:col-span-8">
            {/* Composer Card */}
            <Card className="rounded-2xl border border-slate-200 bg-white/95 shadow-md backdrop-blur-sm transition-shadow hover:shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <Avatar className="mt-1 h-12 w-12 border-2 border-emerald-100">
                    <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-emerald-600 font-bold text-white">
                      U
                    </AvatarFallback>
                  </Avatar>

                  <div className="min-w-0 flex-1">
                    <button
                      type="button"
                      className="w-full cursor-pointer rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-slate-50/50 px-4 py-3 text-left text-sm text-slate-600 transition-colors hover:bg-slate-100"
                      // later you can open the dialog from here if you want
                    >
                      Share a tool, prompt, or workflow…
                    </button>

                    <div className="mt-4 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-600 transition-all hover:bg-emerald-50 hover:text-emerald-700"
                        >
                          <ImageIcon className="h-4 w-4" />
                          <span>Media</span>
                        </button>
                        <button
                          type="button"
                          className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-600 transition-all hover:bg-emerald-50 hover:text-emerald-700"
                        >
                          <BarChart3Icon className="h-4 w-4" />
                          <span>Chart</span>
                        </button>
                        <button
                          type="button"
                          className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-600 transition-all hover:bg-emerald-50 hover:text-emerald-700"
                        >
                          <Link2Icon className="h-4 w-4" />
                          <span>Link</span>
                        </button>
                      </div>

                      <Button
                        type="button"
                        className="rounded-full bg-gradient-to-r from-emerald-600 to-emerald-700 px-6 font-semibold text-white shadow-md transition-all hover:from-emerald-700 hover:to-emerald-800 hover:shadow-lg"
                      >
                        Post
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tabs */}
            <div className="flex items-center gap-8 border-b border-slate-200 px-2">
              <TabButton active={tab === "for-you"} onClick={() => setTab("for-you")}>
                For You
              </TabButton>
              <TabButton active={tab === "following"} onClick={() => setTab("following")}>
                Following
              </TabButton>
              <TabButton active={tab === "trending"} onClick={() => setTab("trending")}>
                Trending
              </TabButton>
              <TabButton active={tab === "new"} onClick={() => setTab("new")}>
                New
              </TabButton>
            </div>

            {/* Feed Posts */}
            <div className="space-y-5">
              {filtered.map((p) => (
                <PostCard
                  key={p.id}
                  post={p}
                  isLiked={likedPosts.has(p.id)}
                  isSaved={savedPosts.has(p.id)}
                  onLike={() => toggleLike(p.id)}
                  onSave={() => toggleSave(p.id)}
                />
              ))}
            </div>
          </div>

          {/* RIGHT SIDEBAR */}
          <div className="col-span-12 space-y-6 md:col-span-4">
            {/* Ask Community Card */}
            <Card className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-emerald-50/50 shadow-md transition-shadow hover:shadow-lg">
              <CardContent className="p-6">
                <div className="mb-3 flex items-start gap-3">
                  <Sparkles className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-600" />
                  <div>
                    <h3 className="font-bold text-slate-900">Ask the Community</h3>
                    <p className="mt-1 text-sm text-slate-600">
                      Stuck on a prompt? Need a tool recommendation? Get answers fast.
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  className="mt-4 w-full rounded-full bg-gradient-to-r from-emerald-600 to-emerald-700 font-semibold text-white shadow-md transition-all hover:from-emerald-700 hover:to-emerald-800 hover:shadow-lg"
                >
                  Start a Discussion
                </Button>
              </CardContent>
            </Card>

            {/* Trending Tools */}
            <Card className="rounded-2xl border border-slate-200 bg-white/95 shadow-md backdrop-blur-sm transition-shadow hover:shadow-lg">
              <CardContent className="p-6">
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-emerald-600" />
                    <h3 className="font-bold text-slate-900">Trending Tools</h3>
                  </div>
                  <button
                    type="button"
                    className="text-xs font-semibold text-emerald-600 transition-colors hover:text-emerald-700"
                  >
                    View all
                  </button>
                </div>

                <div className="space-y-3">
                  {TRENDING_TOOLS.map((t, idx) => (
                    <button
                      type="button"
                      key={t.name}
                      className="group flex w-full items-center justify-between rounded-xl border border-slate-200 bg-gradient-to-r from-slate-50 to-slate-50/50 px-4 py-3 transition-all hover:shadow-md"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 text-sm font-bold text-white">
                          {idx + 1}
                        </div>
                        <div className="font-medium text-slate-900 transition-colors group-hover:text-emerald-700">
                          {t.name}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
                        <span className="text-sm font-bold text-emerald-600">{t.tag}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Top Prompts */}
            <Card className="rounded-2xl border border-slate-200 bg-white/95 shadow-md backdrop-blur-sm transition-shadow hover:shadow-lg">
              <CardContent className="p-6">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="font-bold text-slate-900">Top Prompts This Week</h3>
                  <span className="text-xs font-semibold text-slate-500">This week</span>
                </div>

                <div className="space-y-3">
                  {TOP_PROMPTS.map((p, idx) => (
                    <button
                      type="button"
                      key={p.name}
                      className="group w-full rounded-xl border border-slate-200 bg-gradient-to-br from-white to-slate-50/50 p-4 text-left transition-all hover:border-emerald-300 hover:shadow-md"
                    >
                      <div className="flex items-start gap-2">
                        <div className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-xs font-bold text-emerald-700">
                          {idx + 1}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold text-slate-900 transition-colors group-hover:text-emerald-700">
                            {p.name}
                          </div>
                          <p className="mt-1 line-clamp-2 text-xs text-slate-600 transition-colors group-hover:text-slate-700">
                            {p.desc}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative py-4 text-sm font-medium transition-all duration-200",
        active ? "font-bold text-emerald-700" : "text-slate-600 hover:text-slate-900"
      )}
    >
      {children}
      {active && (
        <span className="absolute bottom-0 left-0 right-0 h-1 rounded-full bg-gradient-to-r from-emerald-600 to-emerald-500" />
      )}
    </button>
  );
}

function PostCard({
  post,
  isLiked,
  isSaved,
  onLike,
  onSave,
}: {
  post: Post;
  isLiked: boolean;
  isSaved: boolean;
  onLike: () => void;
  onSave: () => void;
}) {
  return (
    <Card
      className={cn(
        "rounded-2xl border border-slate-200 bg-white/95 shadow-md backdrop-blur-sm transition-all duration-300",
        // keep the “premium” feel but avoid big layout jumps
        "hover:border-emerald-300 hover:shadow-lg hover:scale-[1.01]",
        "overflow-hidden"
      )}
    >
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <Avatar className="mt-1 h-12 w-12 flex-shrink-0 border-2 border-emerald-100">
            <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-emerald-600 font-bold text-white">
              {post.author.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <div className="min-w-0 flex-1">
            {/* Header */}
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="font-bold text-slate-900">{post.author}</span>
              <span className="text-slate-500">{post.handle}</span>
              <span className="text-slate-500">·</span>
              <span className="text-slate-500">{post.time}</span>

              <Badge className="ml-auto rounded-full bg-emerald-100 text-emerald-700 hover:bg-emerald-200">
                Tool Review
              </Badge>
            </div>

            {/* Title */}
            <h3 className="mt-3 text-lg font-bold leading-snug text-slate-900 transition-colors hover:text-emerald-700">
              {post.title}
            </h3>

            {/* Body */}
            <p className="mt-2 text-sm leading-relaxed text-slate-600">{post.body}</p>

            {/* Chart Preview */}
            {post.hasChart && (
              <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-slate-50/50">
                <div className="border-b border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600">
                  📊 Chart preview
                </div>
                <div className="h-48 w-full bg-gradient-to-br from-emerald-50 to-emerald-50/30" />
              </div>
            )}

            {/* Images Preview */}
            {post.hasImages && (
              <div className="mt-4 grid grid-cols-3 gap-3">
                <div className="h-24 rounded-xl border border-slate-200 bg-gradient-to-br from-slate-100 to-slate-50" />
                <div className="h-24 rounded-xl border border-slate-200 bg-gradient-to-br from-slate-100 to-slate-50" />
                <div className="flex h-24 items-center justify-center rounded-xl border border-slate-200 bg-gradient-to-br from-slate-100 to-slate-50">
                  <span className="text-xs font-semibold text-slate-500">+2 more</span>
                </div>
              </div>
            )}

            {/* Tags */}
            <div className="mt-4 flex flex-wrap gap-2">
              {post.tags.map((t) => (
                <Badge
                  key={t}
                  variant="secondary"
                  className="cursor-pointer rounded-full bg-slate-100 text-slate-700 transition-colors hover:bg-emerald-100 hover:text-emerald-700"
                >
                  {t}
                </Badge>
              ))}
            </div>

            {/* Actions */}
            <div className="mt-4 flex items-center gap-1 text-sm text-slate-600">
              <button
                type="button"
                onClick={onLike}
                className={cn(
                  "flex items-center gap-2 rounded-full px-3 py-2 transition-all",
                  isLiked ? "bg-red-50 text-red-600 hover:bg-red-100" : "hover:bg-slate-100 hover:text-slate-900"
                )}
                aria-pressed={isLiked}
                title="Like"
              >
                <Heart className={cn("h-4 w-4", isLiked && "fill-current")} />
                <span className="text-xs font-medium">{post.likes}</span>
              </button>

              <button
                type="button"
                className="flex items-center gap-2 rounded-full px-3 py-2 transition-all hover:bg-slate-100 hover:text-slate-900"
                title="Comment"
              >
                <MessageCircle className="h-4 w-4" />
                <span className="text-xs font-medium">{post.replies}</span>
              </button>

              <button
                type="button"
                className="flex items-center gap-2 rounded-full px-3 py-2 transition-all hover:bg-slate-100 hover:text-slate-900"
                title="Share"
              >
                <Share2 className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={onSave}
                className={cn(
                  "ml-auto flex items-center gap-2 rounded-full px-3 py-2 transition-all",
                  isSaved ? "bg-amber-50 text-amber-600 hover:bg-amber-100" : "hover:bg-slate-100 hover:text-slate-900"
                )}
                aria-pressed={isSaved}
                title="Save"
              >
                <Bookmark className={cn("h-4 w-4", isSaved && "fill-current")} />
              </button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function CreatePostDialog({
  onCreate,
}: {
  onCreate: (p: Omit<Post, "id" | "time" | "likes" | "replies">) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [title, setTitle] = React.useState("");
  const [body, setBody] = React.useState("");
  const [tags, setTags] = React.useState<string[]>([]);
  const [tagInput, setTagInput] = React.useState("");

  const addTag = () => {
    const t = tagInput.trim();
    if (!t) return;
    if (!tags.includes(t)) setTags((prev) => [...prev, t]);
    setTagInput("");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          className="rounded-full bg-gradient-to-r from-emerald-600 to-emerald-700 px-6 font-semibold text-white shadow-md transition-all hover:from-emerald-700 hover:to-emerald-800 hover:shadow-lg"
        >
          <PlusIcon className="mr-2 h-4 w-4" />
          Create Post
        </Button>
      </DialogTrigger>

      <DialogContent className="rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-slate-900">Create Post</DialogTitle>
          <DialogDescription>
            Share a tool, prompt, or result with the community.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">Title</label>
            <input
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-emerald-500"
              placeholder="What's your post about?"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">Description</label>
            <textarea
              className="min-h-[140px] w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-emerald-500"
              placeholder="Write your post…"
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">Tags</label>
            <div className="mb-2 flex gap-2">
              <input
                className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-emerald-500"
                placeholder="Add a tag…"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addTag();
                  }
                }}
              />
              <Button
                type="button"
                onClick={addTag}
                className="rounded-lg bg-emerald-100 text-emerald-700 transition-colors hover:bg-emerald-200"
              >
                Add
              </Button>
            </div>

            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <Badge
                  key={tag}
                  className="cursor-pointer rounded-full bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                  onClick={() => setTags((prev) => prev.filter((t) => t !== tag))}
                  title="Remove tag"
                >
                  {tag} ×
                </Badge>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            className="rounded-full border-slate-200 hover:bg-slate-100"
          >
            Cancel
          </Button>

          <Button
            type="button"
            className="rounded-full bg-gradient-to-r from-emerald-600 to-emerald-700 font-semibold text-white shadow-md transition-all hover:from-emerald-700 hover:to-emerald-800 hover:shadow-lg"
            onClick={() => {
              onCreate({
                author: "You",
                handle: "@you",
                title: title || "Untitled",
                body: body || "",
                tags: tags.length > 0 ? tags : ["Community"],
                hasChart: false,
                hasImages: false,
              });

              setTitle("");
              setBody("");
              setTags([]);
              setTagInput("");
              setOpen(false);
            }}
          >
            Post
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}