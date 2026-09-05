import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, ChevronLeft, RotateCcw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router";
import type { AgentEvent } from "@adui-forge/contracts";
import { AppShell } from "@/components/app-shell.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { fetchRun, streamRunEvents } from "@/lib/api.ts";
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
    return (
      <AppShell>
        <p className="text-sm text-slate-500">加载中…</p>
      </AppShell>
    );
  }
  if (isError) {
    return (
      <AppShell>
        <p role="alert" className="flex items-center gap-2 text-sm text-red-600">
          <AlertCircle className="h-4 w-4" /> {String(error)}
        </p>
        <Link to="/runs" className="mt-3 inline-block text-sm text-brand-500 hover:text-brand-600">
          ← 返回列表
        </Link>
      </AppShell>
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

  return (
    <AppShell>
      <Link
        to="/runs"
        className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-brand-500"
      >
        <ChevronLeft className="h-4 w-4" /> 返回列表
      </Link>

      <div className="mt-3 flex items-center gap-3">
        <h1 className="text-xl font-bold text-slate-900">{run.task}</h1>
        <Badge tone={statusTone(run.status)}>{statusLabel(run.status)}</Badge>
      </div>
      <p className="mt-1 text-sm text-slate-500">
        {run.agentName} · {new Date(run.createdAt).toLocaleString()}
      </p>
      {run.error !== undefined && (
        <p
          role="alert"
          className="mt-3 flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          <AlertCircle className="h-4 w-4" /> {run.error}
        </p>
      )}
      {run.status === "waiting_approval" && (
        <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">
          该 Run 正在等待人工审批，去{" "}
          <Link to="/approvals" className="font-medium underline">
            审批页
          </Link>{" "}
          处理。
        </p>
      )}

      {streamedText.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>模型输出（实时流式）</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="max-h-80 overflow-auto rounded-lg bg-slate-900 p-4 font-mono text-xs leading-relaxed text-slate-100">
              {streamedText}
            </pre>
          </CardContent>
        </Card>
      )}

      <div className="mt-6 mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-500">执行事件流</h2>
        <div className="flex gap-1">
          {EVENT_FILTERS.map((filter) => (
            <button
              key={filter.value}
              type="button"
              onClick={() => setEventFilter(filter.value)}
              className={
                eventFilter === filter.value
                  ? "rounded-full bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700"
                  : "rounded-full px-2.5 py-1 text-xs text-slate-500 hover:bg-slate-100"
              }
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <ol className="divide-y divide-slate-100">
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
                        ? "font-mono text-xs font-semibold text-red-600"
                        : "font-mono text-xs font-semibold text-slate-700"
                    }
                  >
                    {event.name}
                  </span>
                  <span className="text-xs text-slate-400">
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
              <li className="px-4 py-6 text-center text-sm text-slate-400">暂无匹配事件</li>
            )}
          </ol>
        </CardContent>
      </Card>

      {!isTerminalStatus(run.status) && run.status !== "waiting_approval" && (
        <p className="mt-3 flex items-center gap-2 text-sm text-slate-500">
          <RotateCcw className="h-3.5 w-3.5 animate-spin" /> 订阅中，事件将实时推送…
        </p>
      )}
    </AppShell>
  );
}
