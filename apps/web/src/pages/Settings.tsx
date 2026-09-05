import { useQuery } from "@tanstack/react-query";
import { Database, LogOut, Server } from "lucide-react";
import { Button, Card, Descriptions } from "antd";
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
    <>
      <h1 className="mb-6 text-xl font-semibold text-slate-100">设置</h1>

      <Card title="API 状态">
        {isLoading && <p className="text-sm text-slate-500">检测中…</p>}
        {isError && <p className="text-sm text-red-600">无法连接 API：{String(error)}</p>}
        {health !== undefined && (
          <Descriptions
            column={1}
            items={[
              {
                key: "service",
                label: (
                  <span className="flex items-center gap-1.5">
                    <Server className="h-3.5 w-3.5" /> 服务
                  </span>
                ),
                children: health.status,
              },
              {
                key: "db",
                label: (
                  <span className="flex items-center gap-1.5">
                    <Database className="h-3.5 w-3.5" /> 数据库
                  </span>
                ),
                children:
                  health.db === "up"
                    ? "已连接"
                    : health.db === "down"
                      ? "连接失败"
                      : "未配置（内存模式）",
              },
            ]}
          />
        )}
      </Card>

      <Card title="登录态" className="mt-4">
        <div className="flex gap-2">
          <Button onClick={() => window.location.assign("/login")}>前往登录 / 注册</Button>
          <Button
            type="text"
            icon={<LogOut className="h-4 w-4" />}
            onClick={() => {
              clearToken();
              window.location.reload();
            }}
          >
            清除本机令牌
          </Button>
        </div>
      </Card>
    </>
  );
}
