// src/features/layout/Sidebar.tsx
import * as React from "react";
import { NavLink } from "react-router-dom";
import {
  CompassIcon,
  HomeIcon,
  SparklesIcon,
  BookmarkIcon,
  UserIcon,
  SettingsIcon,
  SearchIcon,
  ZapIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

type SidebarProps = {
  collapsed: boolean;
  onToggle: () => void;
};

type Item = {
  to: string;
  label: string;
  icon: React.ReactNode;
};

const mainItems: Item[] = [
  { to: "/feed", label: "Home Feed", icon: <HomeIcon className="size-4" /> },
  { to: "/", label: "Explore", icon: <CompassIcon className="size-4" /> },
  // Map this to your tools directory / recommender page if you want
  { to: "/advisor", label: "Tools Directory", icon: <SparklesIcon className="size-4" /> },
  // Map to saved page if you have one
  { to: "/dashboard", label: "Saved", icon: <BookmarkIcon className="size-4" /> },
  // Map to profile/account page if you have one
  { to: "/dashboard", label: "Profile", icon: <UserIcon className="size-4" /> },
];

const communities = [
  { name: "Midjourney Pro", dot: "bg-purple-500" },
  { name: "GPT Prompt Eng", dot: "bg-violet-500" },
  { name: "Stable Diffusion", dot: "bg-fuchsia-500" },
];

function SidebarNavItem({
  to,
  label,
  icon,
  collapsed,
}: Item & { collapsed: boolean }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          "group flex h-10 items-center gap-3 rounded-xl px-3 text-sm transition-colors",
          "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
          isActive && "bg-primary/10 text-primary hover:bg-primary/10 hover:text-primary",
          collapsed && "justify-center px-0"
        )
      }
      title={collapsed ? label : undefined}
    >
      <span
        className={cn(
          "grid size-8 place-items-center rounded-lg",
          "text-muted-foreground group-hover:text-foreground",
          collapsed ? "size-9" : "size-8"
        )}
      >
        {icon}
      </span>
      {!collapsed && <span className="font-medium">{label}</span>}
    </NavLink>
  );
}

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
  return (
    <aside
      className={cn(
        "sticky top-0 h-screen shrink-0 border-r bg-card",
        "flex flex-col",
        collapsed ? "w-[76px]" : "w-[280px]"
      )}
    >
      {/* Header */}
      <div className={cn("px-4 pt-5", collapsed && "px-3")}>
        <div className={cn("flex items-center gap-3", collapsed && "justify-center")}>
          {/* Green app icon */}
          <button
            type="button"
            onClick={onToggle}
            className={cn(
              "grid size-10 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-sm",
              "hover:opacity-95 active:opacity-90"
            )}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <ZapIcon className="size-5" />
          </button>

          {!collapsed && (
            <div className="min-w-0">
              <div className="truncate text-base font-semibold">AI Community</div>
              <div className="truncate text-xs text-muted-foreground">Find tools & prompts</div>
            </div>
          )}
        </div>

        {/* Search */}
        {!collapsed && (
          <div className="mt-4">
            <div className="flex items-center gap-2 rounded-xl border bg-background px-3 py-2 text-sm text-muted-foreground">
              <SearchIcon className="size-4" />
              <span className="truncate">Find tools, prompts, people…</span>
            </div>
          </div>
        )}
      </div>

      {/* Main nav */}
      <nav className={cn("mt-5 px-3", collapsed && "px-2")}>
        <div className="space-y-1">
          {mainItems.map((it) => (
            <SidebarNavItem key={it.label} {...it} collapsed={collapsed} />
          ))}
        </div>
      </nav>

      {/* Communities */}
      {!collapsed && (
        <div className="mt-6 px-4">
          <div className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground">
            MY COMMUNITIES
          </div>

          <div className="space-y-2">
            {communities.map((c) => (
              <button
                key={c.name}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                type="button"
              >
                <span className={cn("size-3 rounded-full", c.dot)} />
                <span className="truncate">{c.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Upgrade card + settings */}
      {!collapsed && (
        <div className="px-4 pb-5">
          <div className="rounded-2xl bg-[#0B1220] p-4 text-white shadow-sm">
            <div className="text-sm font-semibold">Upgrade to Pro</div>
            <div className="mt-1 text-xs text-white/70">Get exclusive tools & unlimited views</div>
            <button
              type="button"
              className="mt-4 w-full rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:opacity-95"
            >
              Learn more
            </button>
          </div>

          <div className="mt-4 border-t pt-3">
            <NavLink
              to="/settings"
              className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-muted-foreground hover:bg-muted/60 hover:text-foreground"
            >
              <SettingsIcon className="size-4" />
              <span className="font-medium">Settings</span>
            </NavLink>
          </div>
        </div>
      )}

      {/* Collapsed footer icon */}
      {collapsed && (
        <div className="px-2 pb-4">
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              cn(
                "flex h-10 items-center justify-center rounded-xl transition-colors",
                "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                isActive && "bg-primary/10 text-primary"
              )
            }
            title="Settings"
          >
            <SettingsIcon className="size-4" />
          </NavLink>
        </div>
      )}
    </aside>
  );
}