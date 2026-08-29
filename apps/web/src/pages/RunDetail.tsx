import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router";
import type { AgentEvent } from "@adui-forge/contracts";
import { fetchRun, streamRunEvents } from "../lib/api.ts";
import { statusLabel } from "./Runs.tsx";

const isTerminalStatus = (status: string): boolean =>
  ["completed", "failed", "cancelled", "timeout"].includes(status);

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
      <main>
        <p>加载中…</p>
      </main>
    );
  }
  if (isError) {
    return (
      <main>
        <p role="alert">{String(error)}</p>
        <a href="/runs">← 返回列表</a>
      </main>
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
    <main>
      <p>
        <a href="/runs">← 返回列表</a>
      </p>
      <h1>
        Run {run.id.slice(0, 16)}… — {statusLabel(run.status)}
      </h1>
      <p>Agent: {run.agentName}</p>
      <p>任务：{run.task}</p>
      {run.error !== undefined && <p role="alert">错误：{run.error}</p>}
      {streamedText.length > 0 && (
        <section>
          <h2>模型输出（实时流式）</h2>
          <pre>{streamedText}</pre>
        </section>
      )}
      <h2>执行事件流</h2>
      <label>
        过滤:{" "}
        <select value={eventFilter} onChange={(e) => setEventFilter(e.target.value)}>
          <option value="all">全部</option>
          <option value="model">模型</option>
          <option value="tool">工具</option>
          <option value="approval">审批</option>
          <option value="workflow">Workflow</option>
          <option value="run">Run</option>
        </select>
      </label>
      <ol>
        {events.map((event, index) => (
          <li key={`${event.timestamp}-${index}`}>
            <strong>{event.name}</strong>{" "}
            <small>{new Date(event.timestamp).toLocaleTimeString()}</small>
            {event.payload !== undefined && <pre>{JSON.stringify(event.payload, null, 2)}</pre>}
          </li>
        ))}
      </ol>
      {run.status === "waiting_approval" && (
        <p role="alert">
          该 Run 正在等待人工审批，去 <a href="/approvals">审批页</a> 处理。
        </p>
      )}
      {!isTerminalStatus(run.status) && run.status !== "waiting_approval" && (
        <p>订阅中，事件将实时推送…</p>
      )}
    </main>
  );
}
