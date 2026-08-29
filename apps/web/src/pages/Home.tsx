import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useNavigate } from "react-router";
import { createRun, fetchRuns } from "../lib/api.ts";

export function HomePage() {
  const [task, setTask] = useState("");
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: runs } = useQuery({
    queryKey: ["runs"],
    queryFn: fetchRuns,
    refetchInterval: 3_000,
  });

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
