import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, ChevronLeft, RotateCcw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router";
import type { AgentEvent } from "@adui-forge/contracts";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { cancelRun, fetchRun, retryRun, streamRunEvents } from "@/lib/api.ts";
import { fetchArtifacts, type ArtifactRecord } from "@/lib/api-metrics.ts";
import { fetchPendingApprovals } from "@/lib/approvals.ts";

import { statusLabel, statusTone } from "@/pages/Runs.tsx";

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

  // SSE 实时事件；事件列表用本地状态承接，避免整个 Run 查询频繁失效
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

  if (isLoading) {
    return <p className="text-sm text-slate-500">加载中…</p>;
  }
  if (isError) {
    return (
      <>
        <p role="alert" className="flex items-center gap-2 text-sm text-red-600">
          <AlertCircle className="h-4 w-4" /> {String(error)}
        </p>
        <Link to="/runs" className="mt-3 inline-block text-sm text-brand-300 hover:text-brand-200">
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

  // token 级增量（model.delta）聚合为实时输出面板
  const streamedText = events
    .filter((event) => event.name === "model.delta")
    .map((event) => (event.payload as { text?: string } | undefined)?.text ?? "")
    .join("");

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

  return (
    <>
      <Link
        to="/runs"
        className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-brand-300"
      >
        <ChevronLeft className="h-4 w-4" /> 返回列表
      </Link>

      <div className="mt-3 flex items-center gap-3">
        <h1 className="text-xl font-bold text-slate-100">{run.task}</h1>
        <Badge tone={statusTone(run.status)}>{statusLabel(run.status)}</Badge>
      </div>
      <p className="mt-1 font-mono text-xs text-slate-500">
        {run.id} · {run.agentName} · {new Date(run.createdAt).toLocaleString()}
      </p>

      {run.error !== undefined && (
        <p
          role="alert"
          className="mt-3 flex items-center gap-2 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300"
        >
          <AlertCircle className="h-4 w-4" /> {run.error}
        </p>
      )}
      {run.status === "waiting_approval" && <InlineApprovals runId={run.id} />}
      <div className="mt-3 flex gap-2">
        {!isTerminalStatus(run.status) && run.status !== "waiting_approval" && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              cancel.mutate();
            }}
          >
            取消执行
          </Button>
        )}
        {isTerminalStatus(run.status) && (
          <Button variant="outline" size="sm" onClick={() => retry.mutate()}>
            <RotateCcw className="h-3.5 w-3.5" /> 重试（创建新 Run）
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

      {artifacts !== undefined && artifacts.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>执行产物</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {artifacts.map((artifact) => (
              <div key={artifact.id}>
                <p className="mb-1 font-mono text-xs text-brand-300">
                  {artifact.name} · {artifact.type}
                </p>
                <pre className="max-h-60 overflow-auto rounded-lg bg-black/50 p-3 font-mono text-xs text-slate-200">
                  {artifact.content}
                </pre>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {streamedText.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>模型输出（实时流式）</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="max-h-80 overflow-auto rounded-lg bg-black/50 p-4 font-mono text-xs leading-relaxed text-slate-100">
              {streamedText}
            </pre>
          </CardContent>
        </Card>
      )}

      <div className="mb-3 mt-6 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-400">执行事件流</h2>
        <div className="flex gap-1">
          {EVENT_FILTERS.map((filter) => (
            <button
              key={filter.value}
              type="button"
              onClick={() => setEventFilter(filter.value)}
              className={
                eventFilter === filter.value
                  ? "rounded-full bg-brand-400/15 px-2.5 py-1 text-xs font-medium text-brand-300 ring-1 ring-brand-400/30"
                  : "rounded-full px-2.5 py-1 text-xs text-slate-400 hover:bg-white/10"
              }
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <ol className="divide-y divide-white/5">
            {events
              .filter((event) => eventFilter === "all" || event.name.startsWith(eventFilter))
              .map((event, index) => (
                <li
                  key={`${event.timestamp}-${index}`}
                  className="flex items-baseline gap-3 px-4 py-2.5"
                >
                  <span
                    className={
                      event.name.endsWith("failed")
                        ? "font-mono text-xs font-semibold text-red-400"
                        : "font-mono text-xs font-semibold text-slate-300"
                    }
                  >
                    {event.name}
                  </span>
                  <span className="text-xs text-slate-500">
                    {new Date(event.timestamp).toLocaleTimeString()}
                  </span>
                  {event.payload !== undefined && (
                    <span className="ml-auto max-w-[50%] truncate font-mono text-xs text-slate-500">
                      {JSON.stringify(event.payload)}
                    </span>
                  )}
                </li>
              ))}
            {events.filter((event) => eventFilter === "all" || event.name.startsWith(eventFilter))
              .length === 0 && (
              <li className="px-4 py-6 text-center text-sm text-slate-500">暂无匹配事件</li>
            )}
          </ol>
        </CardContent>
      </Card>

      {!isTerminalStatus(run.status) && run.status !== "waiting_approval" && (
        <p className="mt-3 flex items-center gap-2 text-sm text-slate-400">
          <RotateCcw className="h-3.5 w-3.5 animate-spin" /> 订阅中，事件将实时推送…
        </p>
      )}
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
      fetchPendingApprovals.length >= 0
        ? import("@/lib/approvals.ts").then((m) =>
            m.submitApprovalDecision(input.id, input.decision),
          )
        : Promise.resolve(),
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
    <Card className="mt-3">
      <CardHeader>
        <CardTitle className="text-sm text-amber-300">等待你的审批</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {mine.map((item) => (
          <div key={item.id}>
            <p className="font-mono text-xs text-slate-300">{item.toolName}</p>
            <pre className="mt-1 overflow-auto rounded-lg bg-black/50 p-3 font-mono text-xs text-slate-200">
              {JSON.stringify(item.input, null, 2)}
            </pre>
            <div className="mt-2 flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={decision.isPending}
                onClick={() => decision.mutate({ id: item.id, decision: "rejected" })}
              >
                拒绝
              </Button>
              <Button
                size="sm"
                disabled={decision.isPending}
                onClick={() => decision.mutate({ id: item.id, decision: "approved" })}
              >
                批准
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
