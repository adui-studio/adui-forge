import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, ChevronLeft, RotateCcw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router";
import { Button, Card, Empty, Segmented, Tabs, Timeline } from "antd";
import type { AgentEvent } from "@adui-forge/contracts";
import { StatusTag } from "@/components/status-tag.tsx";
import { cancelRun, fetchRun, retryRun, streamRunEvents } from "@/lib/api.ts";
import { fetchArtifacts, type ArtifactRecord } from "@/lib/api-metrics.ts";
import { fetchPendingApprovals, submitApprovalDecision } from "@/lib/approvals.ts";

const isTerminalStatus = (status: string): boolean =>
  ["completed", "failed", "cancelled", "timeout"].includes(status);

const EVENT_FILTERS = [
  { value: "all", label: "全部" },
  { value: "model", label: "模型" },
  { value: "tool", label: "工具" },
  { value: "approval", label: "审批" },
  { value: "workflow", label: "Workflow" },
  { value: "run", label: "Run" },
];

/** 事件 → Timeline 圆点色（§90/§77：运行 Lime、成功 Green、失败 Red） */
const eventDot = (name: string): string | undefined => {
  if (name.endsWith("failed")) return "#EF4444";
  if (name === "run.completed") return "#22C55E";
  if (name.startsWith("tool.") && name !== "tool.started") return "#22C55E";
  if (name === "run.cancelled") return "#71717A";
  if (name === "model.started" || name === "step.started" || name === "run.started")
    return "#6CFF00";
  return undefined;
};

export function RunDetailPage() {
  const { id = "" } = useParams();
  const queryClient = useQueryClient();
  const {
    data: run,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["run", id],
    queryFn: () => fetchRun(id),
  });

  // SSE 实时事件；本地状态承接增量，避免整个 Run 查询频繁失效
  const [liveEvents, setLiveEvents] = useState<AgentEvent[]>([]);
  const [eventFilter, setEventFilter] = useState<string>("all");
  const closeStream = useRef<(() => void) | null>(null);

  useEffect(() => {
    setLiveEvents([]);
    if (run === undefined || isTerminalStatus(run.status)) {
      return;
    }
    closeStream.current = streamRunEvents(
      id,
      (event) => setLiveEvents((previous) => [...previous, event]),
      () => void queryClient.invalidateQueries({ queryKey: ["run", id] }),
    );
    return () => {
      closeStream.current?.();
      closeStream.current = null;
    };
  }, [run?.status, id, queryClient]);

  const { data: artifacts } = useQuery<ArtifactRecord[], Error>({
    queryKey: ["artifacts", id],
    queryFn: () => fetchArtifacts(id),
  });

  const cancel = useMutation({
    mutationFn: () => cancelRun(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["run", id] });
      void queryClient.invalidateQueries({ queryKey: ["runs"] });
    },
  });

  const retry = useMutation({
    mutationFn: () => retryRun(id),
    onSuccess: (created: { id: string }) => {
      void queryClient.invalidateQueries({ queryKey: ["runs"] });
      window.location.href = `/runs/${created.id}`;
    },
  });

  if (isLoading) {
    return (
      <>
        <p className="text-sm text-slate-500">加载中…</p>
      </>
    );
  }
  if (isError) {
    return (
      <>
        <p role="alert" className="flex items-center gap-2 text-sm text-red-600">
          <AlertCircle className="h-4 w-4" /> {String(error)}
        </p>
        <Link to="/runs" className="mt-3 inline-block text-sm text-[#B79AEC] hover:underline">
          ← 返回列表
        </Link>
      </>
    );
  }
  if (run === undefined) {
    return null;
  }

  const events =
    run.events.length >= liveEvents.length
      ? run.events
      : [...run.events, ...liveEvents.slice(run.events.length)];

  // token 级增量（model.delta）聚合为流式输出
  const streamedText = events
    .filter((event) => event.name === "model.delta")
    .map((event) => (event.payload as { text?: string } | undefined)?.text ?? "")
    .join("");

  const filteredEvents = events.filter(
    (event) => eventFilter === "all" || event.name.startsWith(eventFilter),
  );

  return (
    <>
      <Link
        to="/runs"
        className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-[#B79AEC]"
      >
        <ChevronLeft className="h-4 w-4" /> 返回列表
      </Link>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-semibold text-slate-100">{run.task}</h1>
        <StatusTag status={run.status} />
      </div>
      <p className="forge-code mt-1 text-slate-500">
        {run.id} · {run.agentName} · {new Date(run.createdAt).toLocaleString()}
      </p>

      {/* §94 错误 UX：发生了什么 + 可执行动作 */}
      {run.error !== undefined && (
        <Card className="mt-3" style={{ borderColor: "rgba(239,68,68,0.4)" }}>
          <div className="flex items-start gap-3 p-4">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
            <div className="flex-1">
              <p className="text-sm font-medium text-red-300">运行失败</p>
              <p className="forge-code mt-1 text-slate-300">{run.error}</p>
            </div>
          </div>
        </Card>
      )}
      {run.status === "waiting_approval" && <InlineApprovals runId={run.id} />}

      <div className="mt-3 flex gap-2">
        {!isTerminalStatus(run.status) && run.status !== "waiting_approval" && (
          <Button variant="outlined" size="small" onClick={() => cancel.mutate()}>
            取消执行
          </Button>
        )}
        {isTerminalStatus(run.status) && (
          <Button
            variant="outlined"
            size="small"
            icon={<RotateCcw className="h-3.5 w-3.5" />}
            onClick={() => retry.mutate()}
          >
            重试（创建新 Run）
          </Button>
        )}
      </div>
      {cancel.isError && (
        <p role="alert" className="mt-2 text-sm text-red-600">
          {String(cancel.error)}
        </p>
      )}
      {retry.isError && (
        <p role="alert" className="mt-2 text-sm text-red-600">
          {String(retry.error)}
        </p>
      )}

      <Tabs
        className="mt-6"
        defaultActiveKey="events"
        items={[
          {
            key: "output",
            label: "模型输出",
            children: streamedText ? (
              <pre className="forge-code max-h-96 overflow-auto rounded-md border border-[#20242C] bg-[#0D0F13] p-4 whitespace-pre-wrap text-slate-100">
                {streamedText}
              </pre>
            ) : (
              <Empty description="本次运行没有文本输出（可能只发生了工具调用）" />
            ),
          },
          {
            key: "events",
            label: `事件流 (${events.length})`,
            children: (
              <>
                <Segmented
                  className="mb-4"
                  value={eventFilter}
                  onChange={(value) => setEventFilter(value as string)}
                  options={EVENT_FILTERS}
                />
                {filteredEvents.length === 0 ? (
                  <Empty description="暂无匹配事件" />
                ) : (
                  /* §90 Run Timeline */
                  <Timeline
                    items={filteredEvents.map((event) => ({
                      color: eventDot(event.name),
                      children: (
                        <div className="flex items-baseline gap-3">
                          <span
                            className={
                              event.name.endsWith("failed")
                                ? "forge-code font-semibold text-red-400"
                                : "forge-code font-semibold text-slate-300"
                            }
                          >
                            {event.name}
                          </span>
                          <span className="text-xs text-slate-500">
                            {new Date(event.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                      ),
                    }))}
                  />
                )}
              </>
            ),
          },
          {
            key: "artifacts",
            label: `产物 (${artifacts?.length ?? 0})`,
            children:
              artifacts !== undefined && artifacts.length > 0 ? (
                <div className="flex flex-col gap-3">
                  {artifacts.map((artifact) => (
                    <Card
                      key={artifact.id}
                      size="small"
                      title={
                        <span className="forge-code text-xs text-brand-300">
                          {artifact.name} · {artifact.type}
                        </span>
                      }
                    >
                      <pre className="forge-code max-h-60 overflow-auto whitespace-pre-wrap text-slate-200">
                        {artifact.content}
                      </pre>
                    </Card>
                  ))}
                </div>
              ) : (
                <Empty description="Run 完成后会在这里登记执行产物（摘要 / 报告）" />
              ),
          },
        ]}
      />
    </>
  );
}

/** 运行内联审批：等待审批时在详情页直接批准/拒绝（队列之外的快捷路径）。 */
function InlineApprovals({ runId }: { runId: string }) {
  const queryClient = useQueryClient();
  const { data: approvals } = useQuery({
    queryKey: ["approvals"],
    queryFn: fetchPendingApprovals,
    refetchInterval: 2_000,
  });
  const mine = (approvals ?? []).filter((item) => item.runId === runId);
  const decision = useMutation({
    mutationFn: (input: { id: string; decision: "approved" | "rejected" }) =>
      submitApprovalDecision(input.id, input.decision),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["approvals"] });
      void queryClient.invalidateQueries({ queryKey: ["run", runId] });
      void queryClient.invalidateQueries({ queryKey: ["runs"] });
    },
  });

  if (mine.length === 0) {
    return (
      <p className="mt-3 rounded-lg bg-amber-400/10 px-3 py-2 text-sm text-amber-300">
        该 Run 正在等待人工审批。
        <Link to="/approvals" className="ml-1 font-medium underline">
          前往审批页
        </Link>
      </p>
    );
  }
  return (
    <Card className="mt-3" style={{ borderColor: "rgba(245,158,11,0.4)" }}>
      <div className="flex flex-col gap-3 p-4">
        {mine.map((item) => (
          <div key={item.id}>
            <p className="forge-code text-xs text-amber-300">⚠ {item.toolName}</p>
            <pre className="forge-code mt-1 overflow-auto rounded-md border border-[#20242C] bg-[#0D0F13] p-3 text-slate-200">
              {JSON.stringify(item.input, null, 2)}
            </pre>
            <div className="mt-2 flex justify-end gap-2">
              {/* §88 危险方向：Reject 用 Error 色，Approve 不获得默认焦点 */}
              <Button
                danger
                variant="outlined"
                size="small"
                disabled={decision.isPending}
                onClick={() => decision.mutate({ id: item.id, decision: "rejected" })}
              >
                拒绝
              </Button>
              <Button
                color="primary"
                variant="solid"
                size="small"
                disabled={decision.isPending}
                onClick={() => decision.mutate({ id: item.id, decision: "approved" })}
              >
                批准
              </Button>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
