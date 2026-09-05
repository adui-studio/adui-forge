import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Loader2, Send } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router";
import { AppShell } from "@/components/app-shell.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
import { Textarea } from "@/components/ui/input.tsx";
import { createRun, fetchRuns } from "@/lib/api.ts";
import { fetchMetrics } from "@/lib/approvals-metrics.ts";
import { statusLabel, statusTone } from "@/pages/Runs.tsx";

export function HomePage() {
  const [task, setTask] = useState("");
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: runs } = useQuery({
    queryKey: ["runs"],
    queryFn: fetchRuns,
    refetchInterval: 3_000,
  });
  const { data: metrics } = useQuery({
    queryKey: ["metrics"],
    queryFn: fetchMetrics,
    refetchInterval: 3_000,
  });

  const mutation = useMutation({
    mutationFn: () => createRun(task),
    onSuccess: (record) => {
      setTask("");
      void queryClient.invalidateQueries({ queryKey: ["runs"] });
      void queryClient.invalidateQueries({ queryKey: ["metrics"] });
      void navigate(`/runs/${record.id}`);
    },
  });

  const byStatus = metrics?.runs.byStatus ?? {};
  const activeRuns =
    (byStatus.running ?? 0) + (byStatus.queued ?? 0) + (byStatus.waiting_approval ?? 0);

  return (
    <AppShell>
      <div className="mb-8">
        <h1 className="gradient-text text-2xl font-bold tracking-tight">控制台</h1>
        <p className="mt-1 text-sm text-slate-400">Agent 运行总览与快速发起。</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="p-5">
            <p className="text-xs text-slate-400">执行中 / 排队</p>
            <p className="mt-1 text-3xl font-bold text-cyan-300">{activeRuns}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs text-slate-400">已完成</p>
            <p className="mt-1 text-3xl font-bold text-emerald-300">{byStatus.completed ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs text-slate-400">待审批</p>
            <p className="mt-1 text-3xl font-bold text-amber-300">
              {metrics?.approvals.pending ?? 0}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="glow-card mt-6">
        <CardHeader>
          <CardTitle>发起任务</CardTitle>
          <CardDescription>例如：给用户列表增加搜索功能并补充测试</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="flex flex-col gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              if (task.trim().length > 0) mutation.mutate();
            }}
          >
            <Textarea
              value={task}
              placeholder="描述你要完成的任务…"
              rows={3}
              onChange={(event) => setTask(event.target.value)}
            />
            <Button type="submit" disabled={mutation.isPending || task.trim().length === 0}>
              {mutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> 创建中…
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" /> 交给 Agent 执行
                </>
              )}
            </Button>
            {mutation.isError && (
              <p role="alert" className="text-sm text-red-600">
                {String(mutation.error)}
              </p>
            )}
          </form>
        </CardContent>
      </Card>

      <div className="mb-3 mt-8 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-400">最近 Runs</h2>
        <a href="/runs" className="text-sm text-brand-300 hover:text-brand-200">
          全部 →
        </a>
      </div>
      {runs !== undefined && runs.length === 0 && (
        <p className="rounded-lg border border-dashed border-white/15 p-6 text-center text-sm text-slate-500">
          还没有执行记录，发起第一个任务吧。
        </p>
      )}
      <div className="flex flex-col gap-2">
        {runs?.slice(0, 6).map((run) => (
          <Card key={run.id} className="transition-colors hover:border-brand-400/50">
            <CardContent className="flex items-center gap-3 p-4">
              <Badge tone={statusTone(run.status)}>{statusLabel(run.status)}</Badge>
              <span className="flex-1 truncate text-sm text-slate-200">{run.task}</span>
              <button
                type="button"
                aria-label="查看详情"
                className="text-slate-500 transition-colors hover:text-brand-300"
                onClick={() => navigate(`/runs/${run.id}`)}
              >
                <ArrowRight className="h-4 w-4" />
              </button>
            </CardContent>
          </Card>
        ))}
      </div>
    </AppShell>
  );
}
