import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router";
import { fetchRuns } from "../lib/api.ts";

const STATUS_LABEL: Record<string, string> = {
  queued: "排队中",
  running: "执行中",
  waiting_approval: "等待审批",
  waiting_input: "等待输入",
  paused: "已暂停",
  completed: "已完成",
  failed: "失败",
  cancelled: "已取消",
  timeout: "超时",
  preparing: "准备中",
};

export const statusLabel = (status: string): string => STATUS_LABEL[status] ?? status;

export function RunsPage() {
  const [statusFilter, setStatusFilter] = useState("");
  const {
    data: runs,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["runs"],
    queryFn: fetchRuns,
    refetchInterval: 2_000,
  });

  return (
    <main>
      <h1>Runs</h1>
      <p>
        <a href="/">← 发起新任务</a>
      </p>
      {isLoading && <p>加载中…</p>}
      {isError && <p role="alert">{String(error)}</p>}
      {runs !== undefined && runs.length === 0 && <p>还没有 Run，去发一个任务吧。</p>}
      <label>
        状态过滤:{" "}
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">全部</option>
          {Object.entries(STATUS_LABEL).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      {runs !== undefined && runs.length > 0 && (
        <table>
          <thead>
            <tr>
              <th>Run</th>
              <th>状态</th>
              <th>任务</th>
              <th>创建时间</th>
            </tr>
          </thead>
          <tbody>
            {runs
              .filter((run) => statusFilter === "" || run.status === statusFilter)
              .map((run) => (
                <tr key={run.id}>
                  <td>
                    <Link to={`/runs/${run.id}`}>{run.id.slice(0, 16)}…</Link>
                  </td>
                  <td>{statusLabel(run.status)}</td>
                  <td>{run.task.slice(0, 60)}</td>
                  <td>{new Date(run.createdAt).toLocaleString()}</td>
                </tr>
              ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
