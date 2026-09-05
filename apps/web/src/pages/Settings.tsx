import { useQuery } from "@tanstack/react-query";
import { Database, LogOut, Server } from "lucide-react";
import { AppShell } from "@/components/app-shell.tsx";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
import { Button } from "@/components/ui/button.tsx";
import { clearToken } from "@/lib/auth.ts";
import { fetchHealth } from "@/lib/approvals-metrics.ts";

export function SettingsPage() {
  const {
    data: health,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["settings-health"],
    queryFn: fetchHealth,
    refetchInterval: 10_000,
  });

  return (
    <AppShell>
      <h1 className="mb-6 text-xl font-bold text-slate-100">设置</h1>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="h-4 w-4 text-brand-300" /> API 状态
          </CardTitle>
          <CardDescription>后端服务健康状态（每 10 秒刷新）</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center gap-6 text-sm">
          {isLoading && <span className="text-slate-400">检测中…</span>}
          {isError && <span className="text-red-400">无法连接 API：{String(error)}</span>}
          {health !== undefined && (
            <>
              <span className="flex items-center gap-2">
                <span
                  className={
                    health.status === "ok"
                      ? "h-2 w-2 rounded-full bg-emerald-400"
                      : "h-2 w-2 rounded-full bg-red-400"
                  }
                />
                服务 {health.status}
              </span>
              <span className="flex items-center gap-2 text-slate-400">
                <Database className="h-4 w-4" /> 数据库：
                {health.db === "up"
                  ? "已连接"
                  : health.db === "down"
                    ? "连接失败"
                    : "未配置（内存模式）"}
              </span>
            </>
          )}
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>登录态</CardTitle>
          <CardDescription>未配置强制认证时可匿名使用；登录后请求携带 Bearer 令牌</CardDescription>
        </CardHeader>
        <CardContent className="flex gap-2">
          <Button variant="outline" onClick={() => window.location.assign("/login")}>
            前往登录 / 注册
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              clearToken();
              window.location.reload();
            }}
          >
            <LogOut className="h-4 w-4" /> 清除本机令牌
          </Button>
        </CardContent>
      </Card>
    </AppShell>
  );
}
