import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plug, RefreshCw, Zap } from "lucide-react";
import { App as AntApp, Button, Card, Empty, Spin, Tag, Tooltip } from "antd";
import { useTranslation } from "react-i18next";
import { fetchMcpServers, testMcpServer } from "@/lib/api.ts";

/** MCP Servers 管理页：展示 FORGE_MCP_SERVERS 各服务的连接状态与桥接工具，支持按需重连测试。 */
export function McpPage() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
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
        void message.success(t("mcp.testOk", { count: result.toolNames?.length ?? 0 }));
      } else {
        void message.error(t("mcp.testFail", { error: result.error ?? "" }));
      }
      void queryClient.invalidateQueries({ queryKey: ["mcp-servers"] });
    },
  });

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Plug className="h-5 w-5 text-brand-300" />
          <h1 className="text-xl font-semibold text-slate-100">{t("mcp.title")}</h1>
        </div>
        <Button
          icon={<RefreshCw className={"h-3.5 w-3.5" + (isFetching ? " animate-spin" : "")} />}
          onClick={() => void refetch()}
        >
          {t("mcp.refresh")}
        </Button>
      </div>
      <p className="mb-4 text-sm text-slate-400">{t("mcp.subtitle")}</p>

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
                {t("mcp.empty1")}
                <br />
                {t("mcp.empty2")}
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
                {server.status === "connected" ? t("mcp.connected") : t("mcp.failed")}
              </Tag>
              <span className="forge-code text-xs text-slate-500">
                {server.command} {(server.args ?? []).join(" ")}
              </span>
              <Tooltip title={t("mcp.testTooltip")}>
                <Button
                  size="small"
                  className="ml-auto"
                  icon={<Zap className="h-3.5 w-3.5" />}
                  loading={test.isPending && test.variables === server.name}
                  onClick={() => test.mutate(server.name)}
                >
                  {t("mcp.test")}
                </Button>
              </Tooltip>
            </div>
            {server.status === "connected" && (
              <div className="mt-3">
                <p className="mb-1.5 text-xs text-slate-500">
                  {t("mcp.tools", { count: server.toolNames.length })}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {server.toolNames.map((tool) => (
                    <Tag key={tool} className="forge-code">
                      {tool}
                    </Tag>
                  ))}
                  {server.toolNames.length === 0 && (
                    <span className="text-xs text-slate-500">{t("mcp.noTools")}</span>
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
