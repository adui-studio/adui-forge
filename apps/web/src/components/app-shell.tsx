import { ClipboardCheck, Gauge, LayoutList, LogIn, Settings, Workflow } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router";
import { cn } from "@/lib/utils.ts";
import { fetchHealth, fetchPendingApprovals } from "@/lib/approvals-metrics.ts";

const NAV_ITEMS = [
  { to: "/", label: "控制台", icon: Gauge, exact: true },
  { to: "/runs", label: "Runs", icon: LayoutList },
  { to: "/workflows", label: "Workflows", icon: Workflow },
  { to: "/approvals", label: "审批", icon: ClipboardCheck, badge: true as const },
  { to: "/settings", label: "设置", icon: Settings },
];

/** 轻量健康/待审批轮询（侧边栏状态与角标用，5s 级别足够） */
function useSidebarStatus() {
  const [health, setHealth] = useState<"up" | "down" | "unknown">("unknown");
  const [pending, setPending] = useState(0);
  useEffect(() => {
    let alive = true;
    const poll = async () => {
      try {
        const h = await fetchHealth();
        if (alive) setHealth(h.status === "ok" ? "up" : "down");
      } catch {
        if (alive) setHealth("down");
      }
      try {
        const list = await fetchPendingApprovals();
        if (alive) setPending(list.length);
      } catch {
        /* 未登录等场景静默 */
      }
    };
    void poll();
    const timer = setInterval(poll, 5_000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, []);
  return { health, pending };
}

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const location = useLocation();
  const { pending } = useSidebarStatus();
  return (
    <nav className="flex flex-col gap-1">
      {NAV_ITEMS.map((item) => {
        const active = item.exact
          ? location.pathname === item.to
          : location.pathname.startsWith(item.to);
        return (
          <Link
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-all",
              active
                ? "bg-white/10 font-medium text-white ring-1 ring-white/10"
                : "text-slate-400 hover:bg-white/5 hover:text-slate-200",
            )}
          >
            <item.icon className={cn("h-4 w-4", active && "text-brand-300")} />
            <span className="flex-1">{item.label}</span>
            {item.badge && pending > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-400/20 px-1.5 text-[11px] font-semibold text-amber-300 ring-1 ring-amber-400/40">
                {pending}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

function Brand() {
  return (
    <Link to="/" className="flex items-center gap-2.5 px-2 py-1">
      <img
        src="/logo.svg"
        alt="ADui Studio"
        className="h-7 w-7 drop-shadow-[0_0_10px_rgba(108,255,0,0.35)]"
      />
      <span className="gradient-text font-semibold tracking-tight">ADui Forge</span>
    </Link>
  );
}

function StatusFooter() {
  const { health } = useSidebarStatus();
  return (
    <div className="flex items-center gap-2 rounded-lg bg-white/5 px-3 py-2 text-xs text-slate-400">
      <span
        className={cn(
          "h-2 w-2 rounded-full",
          health === "up" && "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]",
          health === "down" && "bg-red-400",
          health === "unknown" && "animate-pulse bg-slate-500",
        )}
      />
      API {health === "up" ? "在线" : health === "down" ? "离线" : "检测中"}
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen lg:pl-56">
      {/* 移动端顶栏 */}
      <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-white/10 bg-[#070b14]/80 px-4 backdrop-blur-xl lg:hidden">
        <Brand />
        <button
          type="button"
          className="rounded-lg border border-white/15 px-3 py-1.5 text-sm text-slate-300"
          onClick={() => setMenuOpen((open) => !open)}
        >
          菜单
        </button>
      </header>
      {menuOpen && (
        <div className="sticky top-14 z-20 border-b border-white/10 bg-[#070b14]/95 px-4 py-3 backdrop-blur-xl lg:hidden">
          <NavLinks onNavigate={() => setMenuOpen(false)} />
        </div>
      )}

      {/* 桌面侧边栏 */}
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-56 flex-col gap-4 border-r border-white/10 bg-black/30 p-3 backdrop-blur-xl lg:flex">
        <Brand />
        <NavLinks />
        <div className="mt-auto flex flex-col gap-2">
          <Link
            to="/login"
            className={cn(
              "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-all",
              location.pathname.startsWith("/login")
                ? "bg-white/10 text-white"
                : "text-slate-400 hover:bg-white/5 hover:text-slate-200",
            )}
          >
            <LogIn className="h-4 w-4" /> 登录 / 注册
          </Link>
          <StatusFooter />
        </div>
      </aside>

      <main className="mx-auto max-w-5xl px-4 py-8 lg:px-8">{children}</main>
    </div>
  );
}
