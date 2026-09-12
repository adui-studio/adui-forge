import {
  Brain,
  ClipboardCheck,
  Gauge,
  LayoutList,
  ListTodo,
  MessageSquare,
  LogIn,
  LogOut,
  BookOpen,
  Menu as MenuIcon,
  Plug,
  Search,
  Settings,
  Users,
  Workflow,
} from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { App as AntApp, Badge, Button, Layout, Menu } from "antd";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { fetchHealth, fetchPendingApprovals } from "@/lib/approvals-metrics.ts";
import { clearToken, getAccessToken } from "@/lib/auth.ts";
import { CommandPalette } from "@/components/command-palette.tsx";

const { Sider, Content, Header } = Layout;

const NAV_ITEMS = [
  { to: "/", labelKey: "nav.dashboard", icon: Gauge, key: "dashboard", exact: true },
  { to: "/runs", labelKey: "nav.runs", icon: LayoutList, key: "runs" },
  { to: "/tasks", labelKey: "nav.tasks", icon: ListTodo, key: "tasks" },
  { to: "/chat", labelKey: "nav.chat", icon: MessageSquare, key: "chat" },
  { to: "/agents", labelKey: "nav.agents", icon: Users, key: "agents" },
  { to: "/workflows", labelKey: "nav.workflows", icon: Workflow, key: "workflows" },
  { to: "/mcp", labelKey: "nav.mcp", icon: Plug, key: "mcp" },
  {
    to: "/approvals",
    labelKey: "nav.approvals",
    icon: ClipboardCheck,
    key: "approvals",
    badge: true as const,
  },
  { to: "/skills", labelKey: "nav.skills", icon: BookOpen, key: "skills" },
  { to: "/memory", labelKey: "nav.memory", icon: Brain, key: "memory" },
  { to: "/settings", labelKey: "nav.settings", icon: Settings, key: "settings" },
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

function activeKey(pathname: string): string {
  const match = [...NAV_ITEMS]
    .sort((a, b) => b.to.length - a.to.length)
    .find((item) => (item.exact ? pathname === item.to : pathname.startsWith(item.to)));
  return match?.key ?? "dashboard";
}

function Brand() {
  return (
    <Link to="/" className="flex items-center gap-2.5 px-2 py-1">
      <img src="/logo.svg" alt="ADui Studio" className="h-7 w-7" />
      <span className="font-semibold tracking-tight text-slate-100">ADui Forge</span>
    </Link>
  );
}

/** 登录态区块：有令牌显示退出，否则显示登录入口 */
function AuthBlock() {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { message } = AntApp.useApp();
  const [token, setToken] = useState<string | null>(null);
  useEffect(() => {
    setToken(getAccessToken());
  }, [location.pathname]);

  if (token !== null && token !== "") {
    return (
      <Button
        type="text"
        block
        icon={<LogOut className="h-4 w-4" />}
        onClick={() => {
          clearToken();
          setToken(null);
          queryClient.clear();
          void message.success(t("nav.loggedOut"));
          void navigate("/");
        }}
      >
        {t("nav.logout")}
      </Button>
    );
  }
  return (
    <Link to="/login" className="block">
      <Button type="text" block icon={<LogIn className="h-4 w-4" />}>
        {t("nav.login")}
      </Button>
    </Link>
  );
}

function StatusFooter() {
  const { t } = useTranslation();
  const { health } = useSidebarStatus();
  return (
    <div className="flex items-center gap-2 rounded-md border border-[#20242C] bg-[#171A21] px-3 py-2 text-xs text-slate-400">
      {/* §69 Lime 仅表示 Agent/API 活动状态（占比 1~3%） */}
      <span
        className={
          health === "up"
            ? "h-2 w-2 rounded-full bg-[#6CFF00] shadow-[0_0_6px_rgba(108,255,0,0.7)]"
            : health === "down"
              ? "h-2 w-2 rounded-full bg-red-400"
              : "h-2 w-2 animate-pulse rounded-full bg-slate-500"
        }
      />
      {t("nav.apiLabel")}{" "}
      {t(
        health === "up"
          ? "nav.apiOnline"
          : health === "down"
            ? "nav.apiOffline"
            : "nav.apiChecking",
      )}
      <span className="ml-auto font-mono text-[10px] text-slate-600">v0.5.0</span>
    </div>
  );
}

function SiderInner({
  onNavigate,
  onOpenPalette,
}: {
  onNavigate?: () => void;
  onOpenPalette?: () => void;
}) {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { pending } = useSidebarStatus();
  return (
    <div className="flex h-full flex-col gap-3 p-3">
      <Link to="/" onClick={onNavigate} className="px-2 py-1">
        <Brand />
      </Link>
      <button
        type="button"
        onClick={() => {
          onNavigate?.();
          onOpenPalette?.();
        }}
        className="flex items-center gap-2 rounded-md border border-[#20242C] bg-[#171A21] px-3 py-1.5 text-xs text-slate-500 transition-colors hover:border-[#3A4150] hover:text-slate-300"
      >
        <Search className="h-3.5 w-3.5" />
        {t("nav.search")}
        <span className="ml-auto rounded border border-[#292E39] px-1 font-mono text-[10px]">
          Ctrl K
        </span>
      </button>
      <Menu
        mode="inline"
        selectedKeys={[activeKey(location.pathname)]}
        onClick={(info) => {
          const target = NAV_ITEMS.find((item) => item.key === info.key);
          if (target === undefined) return;
          onNavigate?.();
          void navigate(target.to);
        }}
        style={{ borderInlineEnd: "none", background: "transparent", flex: 1 }}
        items={NAV_ITEMS.map((item) => ({
          key: item.key,
          label: (
            <span className="flex items-center justify-between">
              <span className="flex items-center gap-2.5">
                <item.icon className="h-4 w-4" />
                {t(item.labelKey)}
              </span>
              {item.badge && pending > 0 && <Badge count={pending} size="small" />}
            </span>
          ),
        }))}
      />
      <div className="flex flex-col gap-2">
        <AuthBlock />
        <StatusFooter />
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPaletteOpen((open) => !open);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <Layout className="min-h-screen">
      {/* 桌面侧边栏（inline style 固定定位：antd 的 .ant-layout-sider position:relative
          会在样式注入顺序上覆盖 Tailwind 的 fixed 工具类，导致侧栏高度塌陷） */}
      <Sider
        width={224}
        className="hidden lg:block"
        style={{ position: "fixed", top: 0, bottom: 0, left: 0, zIndex: 20, overflow: "auto" }}
      >
        <SiderInner onOpenPalette={() => setPaletteOpen(true)} />
      </Sider>
      <Layout style={{ paddingLeft: 224 }}>
        {/* 移动端顶栏 */}
        <Header
          className="sticky top-0 z-20 flex items-center justify-between lg:hidden"
          style={{ paddingInline: 16 }}
        >
          <Link to="/">
            <Brand />
          </Link>
          <Button
            type="text"
            icon={<MenuIcon className="h-4 w-4" />}
            onClick={() => setMenuOpen((open) => !open)}
            aria-label={t("nav.openMenu")}
          />
        </Header>
        {menuOpen && (
          <div className="sticky top-16 z-20 border-b border-[#20242C] bg-[#111318] lg:hidden">
            <SiderInner onNavigate={() => setMenuOpen(false)} />
          </div>
        )}
        <Content className="mx-auto w-full max-w-5xl px-4 py-8 lg:px-8">{children}</Content>
      </Layout>
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </Layout>
  );
}
