import { Bot, ClipboardCheck, LayoutList, LogIn, Workflow } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router";
import { cn } from "@/lib/utils.ts";
import { getPlatformAdapter, type PlatformInfo } from "@/platform/adapter.ts";

const NAV_ITEMS = [
  { to: "/", label: "发起任务", icon: Bot },
  { to: "/runs", label: "Runs", icon: LayoutList },
  { to: "/workflows", label: "Workflows", icon: Workflow },
  { to: "/approvals", label: "审批", icon: ClipboardCheck },
  { to: "/login", label: "登录", icon: LogIn },
];

export function AppShell({ children }: { children: ReactNode }) {
  const location = useLocation();
  const [platform, setPlatform] = useState<PlatformInfo>({ platform: "web" });

  useEffect(() => {
    getPlatformAdapter()
      .getPlatformInfo()
      .then(setPlatform)
      .catch(() => {});
  }, []);

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b border-white/10 bg-[#070b14]/70 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-6 px-4">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-brand-400 to-violet-500 shadow-lg shadow-brand-500/30">
              <Bot className="h-4 w-4 text-white" />
            </span>
            <span className="gradient-text font-semibold tracking-tight">ADui Forge</span>
          </Link>
          <nav className="flex flex-1 items-center gap-1">
            {NAV_ITEMS.map((item) => {
              const active =
                item.to === "/" ? location.pathname === "/" : location.pathname.startsWith(item.to);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition-all",
                    active
                      ? "bg-white/10 font-medium text-white shadow-inner shadow-white/5"
                      : "text-slate-400 hover:bg-white/5 hover:text-slate-200",
                  )}
                >
                  <item.icon className={cn("h-4 w-4", active && "text-brand-300")} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <span className="rounded-full border border-white/15 bg-white/5 px-2.5 py-0.5 font-mono text-[11px] text-slate-400">
            {platform.platform === "desktop" ? "DESKTOP" : "WEB"}
          </span>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-10">{children}</main>
    </div>
  );
}
