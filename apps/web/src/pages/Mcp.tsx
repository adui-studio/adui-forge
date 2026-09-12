import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plug, RefreshCw, Zap } from "lucide-react";
import { App as AntApp, Button, Card, Empty, Spin, Tag, Tooltip } from "antd";
import { fetchMcpServers, testMcpServer } from "@/lib/api.ts";

/** MCP Servers 管理页：展示 FORGE_MCP_SERVERS 各服务的连接状态与桥接工具，支持按需重连测试。 */
export function McpPage() {
  const queryClient = useQueryClient();
  const { message } = AntApp.useApp();
  const {
    data: servers,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["mcp-servers"],
    queryFn: fetchMcpServers,
  });

  const test = useMutation({
    mutationFn: (name: string) => testMcpServer(name),
    onSuccess: (result) => {
      if (result.ok) {
        void message.success(`连接成功，桥接 ${result.toolNames?.length ?? 0} 个工具`);
      } else {
        void message.error(`连接失败：${result.error ?? "未知错误"}`);
      }
      void queryClient.invalidateQueries({ queryKey: ["mcp-servers"] });
    },
  });

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Plug className="h-5 w-5 text-brand-300" />
          <h1 className="text-xl font-semibold text-slate-100">MCP Servers</h1>
        </div>
        <Button
          icon={<RefreshCw className={"h-3.5 w-3.5" + (isFetching ? " animate-spin" : "")} />}
          onClick={() => void refetch()}
        >
          刷新
        </Button>
      </div>
      <p className="mb-4 text-sm text-slate-400">
        通过 <code className="forge-code text-[#B79AEC]">FORGE_MCP_SERVERS</code> 环境变量配置的 MCP
        服务在此展示连接状态；桥接的工具会进入工具池供 Agent 使用。
      </p>

      {isLoading && (
        <div className="flex justify-center py-12">
          <Spin />
        </div>
      )}
      {isError && (
        <p role="alert" className="text-sm text-red-600">
          {String(error)}
        </p>
      )}
      {servers !== undefined && servers.length === 0 && (
        <Card>
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <span className="text-slate-500">
                未配置任何 MCP Server。
                <br />
                在 FORGE_MCP_SERVERS 中添加（JSON 数组：name / command / args）。
              </span>
            }
          />
        </Card>
      )}

      <div className="grid gap-3">
        {servers?.map((server) => (
          <Card key={server.name} size="small">
            <div className="flex flex-wrap items-center gap-3">
              {/* 状态三重编码（§164）：圆点色 + 文字 + 图标 */}
              <span
                className={
                  server.status === "connected"
                    ? "h-2 w-2 shrink-0 rounded-full bg-[#6CFF00]"
                    : "h-2 w-2 shrink-0 rounded-full bg-red-400"
                }
                aria-hidden
              />
              <span className="forge-code text-sm font-semibold text-slate-100">{server.name}</span>
              <Tag className="forge-code" color={server.status === "connected" ? "green" : "red"}>
                {server.status === "connected" ? "已连接" : "连接失败"}
              </Tag>
              <span className="forge-code text-xs text-slate-500">
                {server.command} {(server.args ?? []).join(" ")}
              </span>
              <Tooltip title="重新连接测试（不影响运行中的工具池）">
                <Button
                  size="small"
                  className="ml-auto"
                  icon={<Zap className="h-3.5 w-3.5" />}
                  loading={test.isPending && test.variables === server.name}
                  onClick={() => test.mutate(server.name)}
                >
                  测试连接
                </Button>
              </Tooltip>
            </div>
            {server.status === "connected" && (
              <div className="mt-3">
                <p className="mb-1.5 text-xs text-slate-500">
                  桥接工具（{server.toolNames.length}）
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {server.toolNames.map((tool) => (
                    <Tag key={tool} className="forge-code">
                      {tool}
                    </Tag>
                  ))}
                  {server.toolNames.length === 0 && (
                    <span className="text-xs text-slate-500">该服务未提供工具</span>
                  )}
                </div>
              </div>
            )}
            {server.status === "failed" && server.error !== undefined && (
              <pre className="forge-code mt-3 overflow-auto rounded-md border border-[#3A2020] bg-[#1A1010] p-3 text-xs text-red-300">
                {server.error}
              </pre>
            )}
          </Card>
        ))}
      </div>
      {test.isError && (
        <p role="alert" className="mt-3 text-sm text-red-600">
          {String(test.error)}
        </p>
      )}
    </>
  );
}
