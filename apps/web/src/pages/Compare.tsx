import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Play, Split } from "lucide-react";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button, Card, Empty, Input, Select, Space, Spin, Tag, Tooltip } from "antd";
import {
  createComparison,
  createRun,
  fetchAgents,
  fetchComparison,
  fetchComparisons,
  streamRunEvents,
} from "@/lib/api.ts";
import {
  applyCompareEvent,
  compareDurationSeconds,
  initialCompareState,
  type CompareRunState,
} from "@/lib/compare.ts";
import { useRunNotifications } from "@/hooks/use-run-notifications.ts";

interface CompareColumn {
  agentName: string;
  state: CompareRunState;
}

/** Agent 运行对比：同一任务并发派给多个 Agent，并排流式对比输出/耗时/工具。 */
export function ComparePage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [task, setTask] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [columns, setColumns] = useState<CompareColumn[] | null>(null);
  const closeFns = useRef<Array<() => void>>([]);
  const columnsRef = useRef<CompareColumn[] | null>(null);
  columnsRef.current = columns;

  const { data: agents, isLoading: agentsLoading } = useQuery({
    queryKey: ["agents"],
    queryFn: fetchAgents,
    staleTime: 60_000,
  });
  const { data: history } = useQuery({
    queryKey: ["comparisons"],
    queryFn: fetchComparisons,
  });

  useRunNotifications(undefined);

  const start = useMutation({
    mutationFn: async (selectedAgents: string[]) => {
      // 先建列再并发创建 Run，各自独立 SSE 流
      setColumns(
        selectedAgents.map((agentName) => ({
          agentName,
          state: { ...initialCompareState, status: "running" as const, startedAt: Date.now() },
        })),
      );
      closeFns.current.forEach((close) => close());
      closeFns.current = [];
      await Promise.all(
        selectedAgents.map(async (agentName, index) => {
          const run = await createRun(task, agentName);
          setColumns((current) =>
            current === null
              ? []
              : current.map((column, i) =>
                  i === index ? { ...column, state: { ...column.state, runId: run.id } } : column,
                ),
          );
          closeFns.current.push(
            streamRunEvents(
              run.id,
              (event) => {
                setColumns((current) =>
                  current === null
                    ? []
                    : current.map((column, i) =>
                        i === index
                          ? { ...column, state: applyCompareEvent(column.state, event) }
                          : column,
                      ),
                );
              },
              () => {
                void queryClient.invalidateQueries({ queryKey: ["runs"] });
                void queryClient.invalidateQueries({ queryKey: ["memory"] });
              },
            ),
          );
        }),
      );
    },
    onSuccess: async () => {
      void queryClient.invalidateQueries({ queryKey: ["runs"] });
      // 批次入库：columns 顺序与 selectedAgents 一致
      const current = columnsRef.current;
      if (current !== null) {
        await createComparison({
          task: task.trim(),
          items: current.map((column) => ({
            agentName: column.agentName,
            runId: column.state.runId ?? "",
          })),
        });
        void queryClient.invalidateQueries({ queryKey: ["comparisons"] });
      }
    },
  });

  const loadHistory = async (id: string): Promise<void> => {
    if (anyRunning) return;
    const detail = await fetchComparison(id);
    setColumns(
      detail.results.map((result) => ({
        agentName: result.agentName,
        state: {
          runId: result.runId,
          status:
            result.status === "completed"
              ? ("completed" as const)
              : result.status === "failed"
                ? ("failed" as const)
                : result.status === "cancelled"
                  ? ("cancelled" as const)
                  : ("running" as const),
          text: result.text,
          tools: result.tools,
          error: result.error,
          startedAt: undefined,
          finishedAt: undefined,
        },
      })),
    );
  };

  const canStart =
    task.trim().length > 0 && selected.length >= 2 && selected.length <= 4 && !start.isPending;
  const anyRunning = (columns ?? []).some(
    (column) => column.state.status === "running" || column.state.status === "pending",
  );

  return (
    <>
      <div className="mb-4 flex items-center gap-2">
        <Split className="h-5 w-5 text-brand-300" />
        <h1 className="text-xl font-semibold text-slate-100">{t("compare.title")}</h1>
      </div>
      <p className="mb-4 text-sm text-slate-400">{t("compare.subtitle")}</p>

      {history !== undefined && history.length > 0 && (
        <div className="mb-4 flex items-center gap-2">
          <span className="text-sm text-slate-500">{t("compare.historyLabel")}</span>
          <Select
            aria-label={t("compare.historyLabel")}
            placeholder={t("compare.historyPlaceholder")}
            options={history.slice(0, 15).map((item) => ({
              value: item.id,
              label: `${item.task.slice(0, 40)} · ${new Date(item.createdAt).toLocaleString()}`,
            }))}
            className="min-w-96"
            onChange={(value) => void loadHistory(value)}
          />
        </div>
      )}

      <Card className="mb-6" title={t("compare.setup")}>
        <div className="flex flex-col gap-3">
          <Input.TextArea
            value={task}
            aria-label={t("compare.taskLabel")}
            placeholder={t("compare.taskPlaceholder")}
            rows={2}
            disabled={anyRunning}
            onChange={(event) => setTask(event.target.value)}
          />
          <Space wrap>
            <Select
              mode="multiple"
              aria-label={t("compare.agentsLabel")}
              value={selected}
              placeholder={t("compare.agentsPlaceholder")}
              loading={agentsLoading}
              options={(agents ?? []).map((agent) => ({ value: agent.name, label: agent.name }))}
              onChange={setSelected}
              className="min-w-96"
              disabled={anyRunning}
            />
            <Tooltip title={t("compare.startHint")}>
              <Button
                type="primary"
                icon={<Play className="h-4 w-4" />}
                disabled={!canStart}
                loading={start.isPending}
                onClick={() => start.mutate(selected)}
              >
                {start.isPending ? t("compare.starting") : t("compare.start")}
              </Button>
            </Tooltip>
          </Space>
        </div>
      </Card>

      {columns === null ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={
            <span className="text-slate-500">
              {t("compare.emptyTitle")}
              <br />
              {t("compare.emptyHint")}
            </span>
          }
        />
      ) : (
        <div
          className={
            columns.length <= 2
              ? "grid gap-4 md:grid-cols-2"
              : columns.length === 3
                ? "grid gap-4 md:grid-cols-3"
                : "grid gap-4 md:grid-cols-2 xl:grid-cols-4"
          }
        >
          {columns.map((column) => {
            const duration = compareDurationSeconds(column.state);
            return (
              <Card
                key={column.agentName}
                size="small"
                title={
                  <span className="forge-code text-sm font-semibold text-slate-100">
                    {column.agentName}
                  </span>
                }
                extra={
                  <Space size={4}>
                    {column.state.status === "running" && <Spin size="small" />}
                    {column.state.status === "completed" && (
                      <Tag color="green">{t("status.completed")}</Tag>
                    )}
                    {column.state.status === "failed" && (
                      <Tag color="red">{t("status.failed")}</Tag>
                    )}
                    {column.state.status === "cancelled" && <Tag>{t("status.cancelled")}</Tag>}
                    {duration !== null && (
                      <span className="forge-code text-xs text-slate-500">{duration}s</span>
                    )}
                  </Space>
                }
              >
                {column.state.tools.length > 0 && (
                  <div className="mb-2 flex flex-wrap gap-1">
                    {column.state.tools.map((tool) => (
                      <Tag key={tool} className="forge-code" bordered={false}>
                        {tool}
                      </Tag>
                    ))}
                  </div>
                )}
                {column.state.text === "" && column.state.status === "running" ? (
                  <p className="forge-code text-sm text-slate-500">{t("chat.thinking")}</p>
                ) : (
                  <pre className="forge-code max-h-96 overflow-auto text-sm whitespace-pre-wrap text-slate-100">
                    {column.state.text}
                  </pre>
                )}
                {column.state.status === "failed" && (
                  <p role="alert" className="mt-2 text-sm text-red-400">
                    {t("chat.failedPrefix")}
                    {column.state.error}
                  </p>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
