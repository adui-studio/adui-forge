import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import { fetchWorkflows, runWorkflow } from "../lib/workflows.ts";
import type { WorkflowDefinitionRecord } from "../lib/workflows.ts";

export function WorkflowsPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const {
    data: workflows,
    isLoading,
    isError,
    error,
  } = useQuery<WorkflowDefinitionRecord[], Error>({
    queryKey: ["workflows"],
    queryFn: fetchWorkflows,
  });

  const run = useMutation({
    mutationFn: (name: string) => runWorkflow(name),
    onSuccess: (record: { id: string }) => {
      void queryClient.invalidateQueries({ queryKey: ["runs"] });
      void navigate(`/runs/${record.id}`);
    },
  });

  return (
    <main>
      <h1>Workflows</h1>
      <p>
        <a href="/">← 首页</a>
      </p>
      {isLoading && <p>加载中…</p>}
      {isError && <p role="alert">{String(error)}</p>}
      {workflows !== undefined && workflows.length === 0 && <p>还没有注册的 Workflow。</p>}
      {workflows?.map((workflow) => (
        <div key={workflow.name}>
          <h2>{workflow.name}</h2>
          <p>{workflow.description}</p>
          <ol>
            {workflow.tasks.map((task, index) => (
              <li key={index}>{task}</li>
            ))}
          </ol>
          <button type="button" disabled={run.isPending} onClick={() => run.mutate(workflow.name)}>
            {run.isPending ? "启动中…" : "运行"}
          </button>
        </div>
      ))}
      {run.isError && <p role="alert">{String(run.error)}</p>}
    </main>
  );
}
