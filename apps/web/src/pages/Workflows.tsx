import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Play, Workflow as WorkflowIcon } from "lucide-react";
import { useNavigate } from "react-router";
import { AppShell } from "@/components/app-shell.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
import { fetchWorkflows, runWorkflow } from "@/lib/workflows.ts";
import type { WorkflowDefinitionRecord } from "@/lib/workflows.ts";

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
    <AppShell>
      <div className="mb-6 flex items-center gap-2">
        <WorkflowIcon className="h-5 w-5 text-brand-500" />
        <h1 className="text-xl font-bold text-slate-900">Workflows</h1>
      </div>

      {isLoading && <p className="text-sm text-slate-500">加载中…</p>}
      {isError && (
        <p role="alert" className="text-sm text-red-600">
          {String(error)}
        </p>
      )}
      {workflows !== undefined && workflows.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center text-sm text-slate-500">
            还没有注册的 Workflow。
          </CardContent>
        </Card>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        {workflows?.map((workflow) => (
          <Card key={workflow.name}>
            <CardHeader>
              <CardTitle className="font-mono text-sm">{workflow.name}</CardTitle>
              <CardDescription>{workflow.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <ol className="mb-4 flex flex-col gap-1.5">
                {workflow.tasks.map((task, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm text-slate-600">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-semibold text-brand-700">
                      {index + 1}
                    </span>
                    <span className="line-clamp-2">{task}</span>
                  </li>
                ))}
              </ol>
              <Button size="sm" disabled={run.isPending} onClick={() => run.mutate(workflow.name)}>
                <Play className="h-3.5 w-3.5" /> {run.isPending ? "启动中…" : "运行"}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
      {run.isError && (
        <p role="alert" className="mt-3 text-sm text-red-600">
          {String(run.error)}
        </p>
      )}
    </AppShell>
  );
}
