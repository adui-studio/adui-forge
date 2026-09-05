import { Bot, ClipboardCheck, LayoutList, LogIn, Workflow } from "lucide-react";
import type { ReactNode } from "react";
import { Link, useLocation } from "react-router";
import { cn } from "@/lib/utils.ts";
import { getPlatformAdapter, type PlatformInfo } from "@/platform/adapter.ts";
import { useEffect, useState } from "react";

const NAV_ITEMS = [
  { to: "/", label: "发起任务", icon: Bot },
  { to: "/runs", label: "Runs", icon: LayoutList },
  { to: "/workflows", label: "Workflows", icon: Workflow },
  { to: "/approvals", label: "审批", icon: ClipboardCheck, badge: true },
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
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-6 px-4">
          <Link to="/" className="flex items-center gap-2 font-semibold text-slate-900">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-500 text-white">
              <Bot className="h-4 w-4" />
            </span>
            ADui Forge
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
                    "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition-colors",
                    active
                      ? "bg-brand-50 font-medium text-brand-700"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <span className="rounded-full border border-slate-200 px-2.5 py-0.5 text-xs text-slate-500">
            {platform.platform === "desktop" ? "桌面端" : "Web"}
          </span>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
    </div>
  );
}
