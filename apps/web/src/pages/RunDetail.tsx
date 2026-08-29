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
      <h2>执行事件流</h2>
      <ol>
        {events.map((event, index) => (
          <li key={`${event.timestamp}-${index}`}>
            <strong>{event.name}</strong>{" "}
            <small>{new Date(event.timestamp).toLocaleTimeString()}</small>
            {event.payload !== undefined && <pre>{JSON.stringify(event.payload, null, 2)}</pre>}
          </li>
        ))}
      </ol>
      {!isTerminalStatus(run.status) && <p>订阅中，事件将实时推送…</p>}
    </main>
  );
}
