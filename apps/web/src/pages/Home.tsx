import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { createRun, fetchRuns } from "../lib/api.ts";
import { getPlatformAdapter, type PlatformInfo } from "../platform/adapter.ts";

export function HomePage() {
  const [task, setTask] = useState("");
  const [platform, setPlatform] = useState<PlatformInfo>({ platform: "web" });
  useEffect(() => {
    getPlatformAdapter()
      .getPlatformInfo()
      .then(setPlatform)
      .catch(() => {});
  }, []);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: runs } = useQuery({
    queryKey: ["runs"],
    queryFn: fetchRuns,
    refetchInterval: 3_000,
  });

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
    <main>
      <h1>ADui Forge</h1>
      <p>Agent-Driven Development Platform</p>
      <p>
        <small>运行环境:{platform.platform === "desktop" ? "桌面端（Tauri）" : "浏览器"}</small>
      </p>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (task.trim().length > 0) {
            mutation.mutate();
          }
        }}
      >
        <textarea
          value={task}
          placeholder="描述你要完成的任务，例如：给用户列表增加搜索功能并补充测试"
          rows={4}
          onChange={(event) => setTask(event.target.value)}
        />
        <button type="submit" disabled={mutation.isPending || task.trim().length === 0}>
          {mutation.isPending ? "创建中…" : "交给 Agent 执行"}
        </button>
        {mutation.isError && <p role="alert">{String(mutation.error)}</p>}
      </form>
      <p>
        <a href="/runs">查看全部 Runs →</a> · <a href="/workflows">Workflows →</a> ·{" "}
        <a href="/approvals">待审批 →</a> · <a href="/login">登录 →</a> ·{" "}
        <a
          href="/"
          onClick={() => {
            localStorage.removeItem("forge.accessToken");
          }}
        >
          登出 →
        </a>
      </p>
      <p>
        <button type="button" onClick={() => openExternal("https://adui-forge.void.app")}>
          文档站 ↗
        </button>{" "}
        <button
          type="button"
          onClick={() => openExternal("https://github.com/adui-studio/adui-forge")}
        >
          GitHub ↗
        </button>
      </p>
      {runs !== undefined && runs.length > 0 && (
        <section>
          <h2>最近会话</h2>
          <ul>
            {runs.slice(0, 5).map((run) => (
              <li key={run.id}>
                <a href={`/runs/${run.id}`}>
                  [{run.status}] {run.task.slice(0, 40)}
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
