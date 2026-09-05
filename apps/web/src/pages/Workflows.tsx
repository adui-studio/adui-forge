import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Play, Plus, Workflow as WorkflowIcon } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button.tsx";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
import { Input, Label, Textarea } from "@/components/ui/input.tsx";
import { fetchWorkflows, runWorkflow } from "@/lib/workflows.ts";
import { registerWorkflow } from "@/lib/api.ts";
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
    <>
      <div className="mb-6 flex items-center gap-2">
        <WorkflowIcon className="h-5 w-5 text-brand-300" />
        <h1 className="text-xl font-bold text-slate-100">Workflows</h1>
      </div>

      <RegisterForm
        onRegistered={() => void queryClient.invalidateQueries({ queryKey: ["workflows"] })}
      />

      {isLoading && <p className="mt-6 text-sm text-slate-500">加载中…</p>}
      {isError && (
        <p role="alert" className="mt-6 text-sm text-red-600">
          {String(error)}
        </p>
      )}
      {workflows !== undefined && workflows.length === 0 && (
        <p className="mt-6 rounded-lg border border-dashed border-white/15 p-6 text-center text-sm text-slate-500">
          还没有注册的 Workflow，用上方表单注册第一个。
        </p>
      )}
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {workflows?.map((workflow) => (
          <Card key={workflow.name}>
            <CardHeader>
              <CardTitle className="font-mono text-sm">{workflow.name}</CardTitle>
              <CardDescription>{workflow.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <ol className="mb-4 flex flex-col gap-1.5">
                {workflow.tasks.map((task, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm text-slate-500">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-400/15 text-xs font-semibold text-brand-300">
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
    </>
  );
}

function RegisterForm({ onRegistered }: { onRegistered: () => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [tasksRaw, setTasksRaw] = useState("");
  const [error, setError] = useState<string | null>(null);

  const register = useMutation({
    mutationFn: () =>
      registerWorkflow({
        name: name.trim(),
        description: description.trim(),
        tasks: tasksRaw
          .split("\n")
          .map((line) => line.trim())
          .filter((line) => line.length > 0),
      }),
    onSuccess: () => {
      setName("");
      setDescription("");
      setTasksRaw("");
      setOpen(false);
      onRegistered();
    },
    onError: (err) => setError(String(err)),
  });

  if (!open) {
    return (
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Plus className="h-3.5 w-3.5" /> 注册 Workflow
      </Button>
    );
  }

  const tasks = tasksRaw
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  const valid = /^[a-z0-9-]+$/.test(name.trim()) && tasks.length > 0;

  return (
    <Card className="glow-card">
      <CardHeader>
        <CardTitle>注册 Workflow</CardTitle>
        <CardDescription>
          名称限小写字母 / 数字 / 连字符；任务按行顺序执行（1~10 条）。
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="wf-name">名称</Label>
            <Input
              id="wf-name"
              value={name}
              placeholder="code-review-pipeline"
              onChange={(event) => setName(event.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="wf-desc">描述（可选）</Label>
            <Input
              id="wf-desc"
              value={description}
              placeholder="一句话说明用途"
              onChange={(event) => setDescription(event.target.value)}
            />
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="wf-tasks">任务列表（每行一条，顺序执行）</Label>
          <Textarea
            id="wf-tasks"
            rows={4}
            value={tasksRaw}
            placeholder={"审查代码改动\n补充缺失的测试\n输出评审结论"}
            onChange={(event) => setTasksRaw(event.target.value)}
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
            取消
          </Button>
          <Button
            size="sm"
            disabled={!valid || register.isPending}
            onClick={() => register.mutate()}
          >
            {register.isPending ? "注册中…" : "注册"}
          </Button>
        </div>
        {register.isError && (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
