import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, ExternalLink, GitBranch, Loader2, Send } from "lucide-react";
import { useEffect, useState } from "react";
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
import { statusLabel, statusTone } from "@/pages/Runs.tsx";
import { getPlatformAdapter, type PlatformInfo } from "@/platform/adapter.ts";

export function HomePage() {
  const [task, setTask] = useState("");
  const [platform, setPlatform] = useState<PlatformInfo>({ platform: "web" });
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: runs } = useQuery({
    queryKey: ["runs"],
    queryFn: fetchRuns,
    refetchInterval: 3_000,
  });

  useEffect(() => {
    getPlatformAdapter()
      .getPlatformInfo()
      .then(setPlatform)
      .catch(() => {});
  }, []);

  const openExternal = (url: string): void => {
    void getPlatformAdapter().openExternal(url);
  };

  const mutation = useMutation({
    mutationFn: () => createRun(task),
    onSuccess: (record) => {
      setTask("");
      void queryClient.invalidateQueries({ queryKey: ["runs"] });
      void navigate(`/runs/${record.id}`);
    },
  });

  return (
    <AppShell>
      <div className="mx-auto max-w-2xl">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">把任务交给 Agent</h1>
          <p className="mt-1 text-sm text-slate-500">
            描述目标与边界，Agent 负责理解、规划、执行与验证。
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>新建任务</CardTitle>
            <CardDescription>例如：给用户列表增加搜索功能并补充测试</CardDescription>
          </CardHeader>
          <CardContent>
            <form
              className="flex flex-col gap-3"
              onSubmit={(event) => {
                event.preventDefault();
                if (task.trim().length > 0) {
                  mutation.mutate();
                }
              }}
            >
              <Textarea
                value={task}
                placeholder="描述你要完成的任务…"
                rows={4}
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

        {runs !== undefined && runs.length > 0 && (
          <section className="mt-8">
            <h2 className="mb-3 text-sm font-semibold text-slate-500">最近会话</h2>
            <div className="flex flex-col gap-2">
              {runs.slice(0, 5).map((run) => (
                <Card key={run.id} className="transition-colors hover:border-brand-500">
                  <CardContent className="flex items-center gap-3 p-4">
                    <Badge tone={statusTone(run.status)}>{statusLabel(run.status)}</Badge>
                    <span className="flex-1 truncate text-sm text-slate-700">{run.task}</span>
                    <button
                      type="button"
                      className="text-slate-400 transition-colors hover:text-brand-500"
                      aria-label="查看详情"
                      onClick={() => navigate(`/runs/${run.id}`)}
                    >
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </CardContent>
                </Card>
              ))}
            </div>
            <div className="mt-3 text-right">
              <a href="/runs" className="text-sm text-brand-500 hover:text-brand-600">
                查看全部 Runs →
              </a>
            </div>
          </section>
        )}

        <footer className="mt-12 flex items-center justify-center gap-2 text-xs text-slate-400">
          <span>运行环境:{platform.platform === "desktop" ? "桌面端（Tauri）" : "浏览器"}</span>
          <span>·</span>
          <button
            type="button"
            className="inline-flex items-center gap-1 hover:text-slate-600"
            onClick={() => openExternal("https://adui-forge.void.app")}
          >
            <ExternalLink className="h-3 w-3" /> Void
          </button>
          <span>·</span>
          <button
            type="button"
            className="inline-flex items-center gap-1 hover:text-slate-600"
            onClick={() => openExternal("https://adui-studio.github.io/adui-forge/")}
          >
            <ExternalLink className="h-3 w-3" /> 文档
          </button>
          <span>·</span>
          <button
            type="button"
            className="inline-flex items-center gap-1 hover:text-slate-600"
            onClick={() => openExternal("https://github.com/adui-studio/adui-forge")}
          >
            <GitBranch className="h-3 w-3" /> GitHub
          </button>
        </footer>
      </div>
    </AppShell>
  );
}
