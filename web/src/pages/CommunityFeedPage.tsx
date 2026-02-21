import * as React from "react";
import {
  SearchIcon,
  PlusIcon,
  ImageIcon,
  BarChart3Icon,
  Link2Icon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
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
};

const SEED_POSTS: Post[] = [
  {
    id: "1",
    author: "Sarah Chen",
    handle: "@sarah",
    time: "2h",
    title: "Jasper’s new brand voice feature is a game changer",
    body:
      "I tested it for 3 hours. It’s surprisingly good at picking up subtle tone nuances. Here’s a quick comparison I ran.",
    tags: ["Tool Review", "Copywriting", "Brand Voice"],
    hasChart: true,
  },
  {
    id: "2",
    author: "David Miller",
    handle: "@david",
    time: "5h",
    title: "Consistent Character Generation Workflow",
    body:
      "Finally cracked a repeatable pipeline for consistent faces. Here’s my seed strategy + prompt structure.",
    tags: ["Workflow", "Midjourney", "Prompting"],
    hasImages: true,
  },
];

const TRENDING_TOOLS = [
  { name: "Runway Gen-2", tag: "+3.1%" },
  { name: "UX Pilot", tag: "+2.8%" },
  { name: "Magnific AI", tag: "+1.9%" },
];

const TOP_PROMPTS = [
  { name: "Midjourney", desc: "Cinematic shot of a cyberpunk street food vendor, neon rain, 8k…" },
  { name: "VS Pixel", desc: "Act as a senior python developer. Code review the following…" },
  { name: "Web Pilot", desc: "Draft a product brief and landing copy for this…" },
];

type FeedTab = "for-you" | "following" | "trending" | "new";

export function CommunityFeedPage() {
  const [tab, setTab] = React.useState<FeedTab>("for-you");
  const [query, setQuery] = React.useState("");
  const [posts, setPosts] = React.useState<Post[]>(SEED_POSTS);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return posts;
    return posts.filter((p) =>
      (p.title + " " + p.body + " " + p.tags.join(" ")).toLowerCase().includes(q)
    );
  }, [posts, query]);

  const addPost = (p: Omit<Post, "id" | "time">) => {
    setPosts((prev) => [{ ...p, id: crypto.randomUUID(), time: "now" }, ...prev]);
  };

  return (
    <div className="min-h-full bg-background">
      <div className="mx-auto max-w-[1180px] px-6 py-6">
        {/* Top row: search + create */}
        <div className="mb-5 flex items-center gap-3">
          <InputGroup className="flex-1">
            <InputGroupAddon>
              <SearchIcon className="size-4" />
            </InputGroupAddon>
            <InputGroupInput
              placeholder="Find tools, prompts, people…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </InputGroup>

          <CreatePostDialog onCreate={addPost} />
        </div>

        {/* Two columns (use md so it still becomes 2-col even with sidebar) */}
        <div className="grid grid-cols-12 gap-6">
          {/* MAIN */}
          <div className="col-span-12 md:col-span-8">
            {/* Composer */}
            <Card className="rounded-2xl border bg-card shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Avatar className="mt-0.5">
                    <AvatarFallback>U</AvatarFallback>
                  </Avatar>

                  <div className="min-w-0 flex-1">
                    <div className="rounded-xl border bg-muted/20 px-3 py-2 text-sm text-muted-foreground">
                      Share a tool, prompt, or workflow…
                    </div>

                    <div className="mt-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <button className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs hover:bg-muted">
                          <ImageIcon className="size-4" /> Media
                        </button>
                        <button className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs hover:bg-muted">
                          <BarChart3Icon className="size-4" /> Chart
                        </button>
                        <button className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs hover:bg-muted">
                          <Link2Icon className="size-4" /> Link
                        </button>
                      </div>

                      <Button size="sm" className="rounded-full px-4">
                        Post
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tabs (match screenshot = simple text) */}
            <div className="mt-4 flex items-center gap-5 text-sm">
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

            {/* Feed */}
            <div className="mt-4 space-y-5">
              {filtered.map((p) => (
                <PostCard key={p.id} post={p} />
              ))}
            </div>
          </div>

          {/* RIGHT RAIL */}
          <div className="col-span-12 md:col-span-4">
            <div className="space-y-6">
              <Card className="rounded-2xl border bg-primary/10 shadow-sm">
                <CardContent className="p-5">
                  <div className="text-sm font-semibold">Ask the Community</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    Stuck on a prompt? Need a tool recommendation? Get answers fast.
                  </div>
                  <Button className="mt-4 w-full rounded-full">Start a Discussion</Button>
                </CardContent>
              </Card>

              <Card className="rounded-2xl border bg-card shadow-sm">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold">Trending Tools</div>
                    <button className="text-xs text-muted-foreground hover:text-foreground">View all</button>
                  </div>

                  <div className="mt-3 space-y-3">
                    {TRENDING_TOOLS.map((t) => (
                      <div key={t.name} className="flex items-center justify-between rounded-xl border bg-muted/15 px-3 py-2">
                        <div className="text-sm font-medium">{t.name}</div>
                        <div className="text-xs text-emerald-700">{t.tag}</div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-2xl border bg-card shadow-sm">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold">Top Prompts This Week</div>
                    <div className="text-xs text-muted-foreground">This week</div>
                  </div>

                  <div className="mt-3 space-y-3">
                    {TOP_PROMPTS.map((p) => (
                      <div key={p.name} className="rounded-xl border bg-muted/10 p-3">
                        <div className="text-xs font-semibold">{p.name}</div>
                        <div className="mt-1 text-xs text-muted-foreground line-clamp-2">{p.desc}</div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "relative text-muted-foreground hover:text-foreground",
        active && "text-foreground font-semibold"
      )}
    >
      {children}
      {active && <span className="absolute -bottom-2 left-0 h-[2px] w-full rounded-full bg-primary" />}
    </button>
  );
}

function PostCard({ post }: { post: Post }) {
  return (
    <Card className="rounded-2xl border bg-card shadow-sm">
      <CardContent className="p-5">
        <div className="flex items-start gap-3">
          <Avatar className="mt-0.5">
            <AvatarFallback>{post.author.slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="font-semibold">{post.author}</span>
              <span className="text-muted-foreground">{post.handle}</span>
              <span className="text-muted-foreground">· {post.time}</span>
              <span className="ml-auto rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                Tool Review
              </span>
            </div>

            <div className="mt-2 text-[15px] font-semibold leading-snug">{post.title}</div>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{post.body}</p>

            {post.hasChart && (
              <div className="mt-4 overflow-hidden rounded-xl border bg-muted/15">
                <div className="px-4 py-2 text-xs text-muted-foreground">Chart preview</div>
                <div className="h-44 w-full bg-muted" />
              </div>
            )}

            {post.hasImages && (
              <div className="mt-4 grid grid-cols-3 gap-3">
                <div className="h-20 rounded-xl border bg-muted" />
                <div className="h-20 rounded-xl border bg-muted" />
                <div className="h-20 rounded-xl border bg-muted/60 flex items-center justify-center text-xs text-muted-foreground">
                  +2 more
                </div>
              </div>
            )}

            <div className="mt-4 flex flex-wrap gap-2">
              {post.tags.map((t) => (
                <Badge key={t} variant="secondary" className="rounded-full">
                  {t}
                </Badge>
              ))}
            </div>

            <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
              <button className="rounded-full px-3 py-1 hover:bg-muted">Useful</button>
              <button className="rounded-full px-3 py-1 hover:bg-muted">Comment</button>
              <button className="rounded-full px-3 py-1 hover:bg-muted">Save</button>
              <button className="ml-auto rounded-full px-3 py-1 hover:bg-muted">+ Follow Author</button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function CreatePostDialog({ onCreate }: { onCreate: (p: Omit<Post, "id" | "time">) => void }) {
  const [open, setOpen] = React.useState(false);
  const [title, setTitle] = React.useState("");
  const [body, setBody] = React.useState("");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="rounded-full">
          <PlusIcon className="mr-2 size-4" /> Create Post
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create post</DialogTitle>
          <DialogDescription>Share a tool, prompt, or result with the community.</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <input
            className="w-full rounded-xl border bg-transparent px-3 py-2 text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/30"
            placeholder="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <textarea
            className="min-h-[120px] w-full rounded-xl border bg-transparent px-3 py-2 text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/30"
            placeholder="Write your post…"
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} className="rounded-full">
            Cancel
          </Button>
          <Button
            className="rounded-full"
            onClick={() => {
              onCreate({
                author: "You",
                handle: "@you",
                title: title || "Untitled",
                body: body || "",
                tags: ["Community"],
              });
              setTitle("");
              setBody("");
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