import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router";
import { AppShell } from "@/components/app-shell.tsx";
import { Badge, type BadgeProps } from "@/components/ui/badge.tsx";
import { Card, CardContent } from "@/components/ui/card.tsx";
import { fetchRuns } from "@/lib/api.ts";

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

const STATUS_TONE: Record<string, BadgeProps["tone"]> = {
  completed: "success",
  failed: "danger",
  running: "info",
  waiting_approval: "warning",
  waiting_input: "warning",
  paused: "neutral",
  cancelled: "neutral",
  timeout: "danger",
  preparing: "info",
  queued: "neutral",
};

export const statusLabel = (status: string): string => STATUS_LABEL[status] ?? status;
export const statusTone = (status: string): BadgeProps["tone"] => STATUS_TONE[status] ?? "neutral";

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
    <AppShell>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-900">Runs</h1>
        <label className="flex items-center gap-2 text-sm text-slate-600">
          状态
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="h-8 rounded-lg border border-slate-300 bg-white px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          >
            <option value="">全部</option>
            {Object.entries(STATUS_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {isLoading && <p className="text-sm text-slate-500">加载中…</p>}
      {isError && (
        <p role="alert" className="text-sm text-red-600">
          {String(error)}
        </p>
      )}
      {runs !== undefined && runs.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center text-sm text-slate-500">
            还没有 Run，去发一个任务吧。
          </CardContent>
        </Card>
      )}
      {runs !== undefined && runs.length > 0 && (
        <div className="flex flex-col gap-2">
          {runs
            .filter((run) => statusFilter === "" || run.status === statusFilter)
            .map((run) => (
              <Card key={run.id} className="transition-colors hover:border-brand-500">
                <CardContent className="flex items-center gap-3 p-4">
                  <Badge tone={statusTone(run.status)}>{statusLabel(run.status)}</Badge>
                  <Link
                    to={`/runs/${run.id}`}
                    className="flex-1 truncate text-sm font-medium text-slate-800 hover:text-brand-600"
                  >
                    {run.task}
                  </Link>
                  <span className="hidden text-xs text-slate-400 sm:block">
                    {new Date(run.createdAt).toLocaleString()}
                  </span>
                </CardContent>
              </Card>
            ))}
        </div>
      )}
    </AppShell>
  );
}
