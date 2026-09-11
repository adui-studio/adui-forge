import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Database, LogOut, Server } from "lucide-react";
import { Link, useNavigate } from "react-router";
import { App as AntApp, Button, Card, Descriptions, Popconfirm, Spin } from "antd";
import { clearToken } from "@/lib/auth.ts";
import { fetchHealth } from "@/lib/approvals-metrics.ts";

export function SettingsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { message } = AntApp.useApp();
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
        {isLoading && (
          <div className="flex justify-center py-12">
            <Spin />
          </div>
        )}
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
          <Link to="/login">
            <Button>前往登录 / 注册</Button>
          </Link>
          {/* 破坏性操作先确认 */}
          <Popconfirm
            title="清除本机令牌？"
            description="清除后需要重新登录才能访问 API。"
            okText="清除"
            cancelText="取消"
            onConfirm={() => {
              clearToken();
              queryClient.clear();
              void message.success("已清除本机令牌");
              void navigate("/");
            }}
          >
            <Button type="text" icon={<LogOut className="h-4 w-4" />}>
              清除本机令牌
            </Button>
          </Popconfirm>
        </div>
      </Card>
    </>
  );
}
