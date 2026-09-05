import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Play, Plus, Workflow as WorkflowIcon } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router";
import { Button, Card, Empty, Form, Input, Steps } from "antd";
import { fetchWorkflows, runWorkflow } from "@/lib/workflows.ts";
import type { WorkflowDefinitionRecord } from "@/lib/workflows.ts";
import { registerWorkflow } from "@/lib/api.ts";

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
        <h1 className="text-xl font-semibold text-slate-100">Workflows</h1>
      </div>

      <RegisterCard
        onRegistered={() => void queryClient.invalidateQueries({ queryKey: ["workflows"] })}
      />

      {isLoading && <p className="mt-6 text-sm text-slate-500">加载中…</p>}
      {isError && (
        <p role="alert" className="mt-6 text-sm text-red-600">
          {String(error)}
        </p>
      )}
      {workflows !== undefined && workflows.length === 0 && (
        <Empty className="mt-6" description="还没有注册的 Workflow，用上方表单注册第一个" />
      )}
      <div className="mt-6 grid gap-3 md:grid-cols-2">
        {workflows?.map((workflow) => (
          <Card key={workflow.name}>
            <Card.Meta
              title={<span className="forge-code text-sm">{workflow.name}</span>}
              description={workflow.description}
            />
            {/* §107 节点序列视觉：Neutral Steps */}
            <Steps
              className="mt-4"
              size="small"
              direction="vertical"
              items={workflow.tasks.map((task, index) => ({
                title: <span className="text-sm text-slate-300">{task}</span>,
                status: index === 0 ? "process" : "wait",
              }))}
            />
            <Button
              size="small"
              className="mt-3"
              disabled={run.isPending}
              onClick={() => run.mutate(workflow.name)}
            >
              <Play className="mr-1 inline h-3.5 w-3.5" />
              {run.isPending ? "启动中…" : "运行"}
            </Button>
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

/** 注册表单（§53：普通内容用内联面板而非 Modal） */
function RegisterCard({ onRegistered }: { onRegistered: () => void }) {
  const [form] = Form.useForm<{
    name: string;
    description?: string;
    tasks: string;
  }>();
  const [open, setOpen] = useState(false);

  const register = useMutation({
    mutationFn: (values: { name: string; description?: string; tasks: string }) =>
      registerWorkflow({
        name: values.name.trim(),
        description: values.description?.trim() ?? "",
        tasks: values.tasks
          .split("\n")
          .map((line) => line.trim())
          .filter((line) => line.length > 0),
      }),
    onSuccess: () => {
      form.resetFields();
      setOpen(false);
      onRegistered();
    },
  });

  if (!open) {
    return (
      <Button
        variant="outlined"
        icon={<Plus className="h-3.5 w-3.5" />}
        onClick={() => setOpen(true)}
      >
        注册 Workflow
      </Button>
    );
  }

  return (
    <Card className="mb-6" title="注册 Workflow">
      <Form
        form={form}
        layout="vertical"
        onFinish={(values) => register.mutate(values)}
        requiredMark={false}
      >
        <Form.Item
          name="name"
          label="名称"
          rules={[
            { required: true, message: "名称不能为空" },
            {
              pattern: /^[a-z0-9-]+$/,
              message: "仅允许小写字母、数字与连字符",
            },
          ]}
        >
          <Input placeholder="code-review-pipeline" />
        </Form.Item>
        <Form.Item name="description" label="描述（可选）">
          <Input placeholder="一句话说明用途" />
        </Form.Item>
        <Form.Item
          name="tasks"
          label="任务列表（每行一条，顺序执行）"
          rules={[
            { required: true, message: "至少填写一条任务" },
            {
              validator: (_, value: string) =>
                value && value.split("\n").filter((l) => l.trim()).length > 10
                  ? Promise.reject(new Error("最多 10 条任务"))
                  : Promise.resolve(),
            },
          ]}
        >
          <Input.TextArea rows={4} placeholder={"审查代码改动\n补充缺失的测试\n输出评审结论"} />
        </Form.Item>
        {/* §46 表单错误在字段下方显示原因 */}
        {register.isError && (
          <p role="alert" className="mb-3 text-sm text-red-600">
            {String(register.error)}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button onClick={() => setOpen(false)}>取消</Button>
          <Button type="primary" loading={register.isPending} htmlType="submit">
            注册
          </Button>
        </div>
      </Form>
    </Card>
  );
}
