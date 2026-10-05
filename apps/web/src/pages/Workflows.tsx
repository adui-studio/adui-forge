import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Play, Plus, Workflow as WorkflowIcon } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { Button, Card, Empty, Form, Input, Listy, Popconfirm, Space, Spin, Steps } from "antd";
import { deleteWorkflow, fetchWorkflows, runWorkflow } from "@/lib/workflows.ts";
import type { WorkflowDefinitionRecord } from "@/lib/workflows.ts";
import { fetchRuns, registerWorkflow } from "@/lib/api.ts";
import { StatusTag } from "@/components/status-tag.tsx";

export function WorkflowsPage() {
  const { t } = useTranslation();
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

  // 运行历史：Workflow 执行即 Run（agentName 为 workflow(N steps/nodes)），
  // 与 Runs 页共用 queryKey 缓存互通
  const { data: runs } = useQuery({
    queryKey: ["runs"],
    queryFn: () => fetchRuns(),
    refetchInterval: 5_000,
  });
  const workflowRuns = (runs ?? [])
    .filter((run) => run.agentName.startsWith("workflow("))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 8);
  const runCountFor = (name: string): number =>
    (runs ?? []).filter((run) => run.agentName === `workflow(${name})`).length;

  const remove = useMutation({
    mutationFn: (name: string) => deleteWorkflow(name),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["workflows"] });
    },
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
        <h1 className="text-xl font-semibold text-slate-100">{t("workflows.title")}</h1>
      </div>

      <div className="flex gap-2">
        <RegisterCard
          onRegistered={() => void queryClient.invalidateQueries({ queryKey: ["workflows"] })}
        />
        <Button
          variant="outlined"
          icon={<Plus className="h-3.5 w-3.5" />}
          onClick={() => navigate("/workflows/new")}
        >
          {t("workflows.newVisual")}
        </Button>
      </div>

      {isLoading && (
        <div className="flex justify-center py-12">
          <Spin />
        </div>
      )}
      {isError && (
        <p role="alert" className="mt-6 text-sm text-red-600">
          {String(error)}
        </p>
      )}
      {workflows !== undefined && workflows.length === 0 && (
        <Empty className="mt-6" description={t("workflows.empty")} />
      )}
      <div className="mt-6 grid gap-3 md:grid-cols-2">
        {workflows?.map((workflow) => (
          <Card key={workflow.name}>
            <Card.Meta
              title={<span className="forge-code text-sm">{workflow.name}</span>}
              description={workflow.description}
            />
            {/* 运行溯源：agentName 为 workflow(<name>)，按名归组计数 */}
            {runCountFor(workflow.name) > 0 && (
              <p className="mt-2 text-xs text-slate-500">
                {t("workflows.runCount", { count: runCountFor(workflow.name) })}
              </p>
            )}
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
            <div className="mt-3 flex items-center gap-2">
              <Button
                size="small"
                disabled={run.isPending}
                onClick={() => run.mutate(workflow.name)}
              >
                <Play className="mr-1 inline h-3.5 w-3.5" />
                {run.isPending ? t("workflows.starting") : t("workflows.run")}
              </Button>
              <Popconfirm
                title={t("workflows.deleteTitle", { name: workflow.name })}
                okText={t("common.delete")}
                cancelText={t("common.cancel")}
                onConfirm={() => remove.mutate(workflow.name)}
              >
                <Button danger size="small">
                  {t("common.delete")}
                </Button>
              </Popconfirm>
            </div>
          </Card>
        ))}
      </div>
      {run.isError && (
        <p role="alert" className="mt-3 text-sm text-red-600">
          {String(run.error)}
        </p>
      )}

      <div className="mb-3 mt-8">
        <h2 className="text-sm font-medium text-slate-400">{t("workflows.runHistory")}</h2>
      </div>
      {workflowRuns.length === 0 ? (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t("workflows.emptyRuns")} />
      ) : (
        <Listy
          items={workflowRuns}
          rowKey={(run) => run.id}
          itemRender={(run) => (
            <Link
              to={`/runs/${run.id}`}
              className="block rounded-md border border-[#20242C] bg-[#111318] px-4 py-3 transition-colors hover:border-brand-400/40"
            >
              <Space>
                <StatusTag status={run.status} />
                <span className="max-w-md truncate text-sm text-slate-300">{run.task}</span>
                <span className="forge-code text-xs text-slate-500">
                  {new Date(run.createdAt).toLocaleString()}
                </span>
              </Space>
            </Link>
          )}
        />
      )}
    </>
  );
}

/** 注册表单（§53：普通内容用内联面板而非 Modal） */
function RegisterCard({ onRegistered }: { onRegistered: () => void }) {
  const { t } = useTranslation();
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
        {t("workflows.register")}
      </Button>
    );
  }

  return (
    <Card className="mb-6" title={t("workflows.formTitle")}>
      <Form
        form={form}
        layout="vertical"
        onFinish={(values) => register.mutate(values)}
        requiredMark={false}
      >
        <Form.Item
          name="name"
          label={t("workflows.nameLabel")}
          rules={[
            { required: true, message: t("workflows.nameRequired") },
            {
              pattern: /^[a-z0-9-]+$/,
              message: t("workflows.namePattern"),
            },
          ]}
        >
          <Input placeholder={t("workflows.namePlaceholder")} />
        </Form.Item>
        <Form.Item name="description" label={t("workflows.descLabel")}>
          <Input placeholder={t("workflows.descPlaceholder")} />
        </Form.Item>
        <Form.Item
          name="tasks"
          label={t("workflows.tasksLabel")}
          rules={[
            { required: true, message: t("workflows.tasksRequired") },
            {
              validator: (_, value: string) =>
                value && value.split("\n").filter((l) => l.trim()).length > 10
                  ? Promise.reject(new Error(t("workflows.tasksTooMany")))
                  : Promise.resolve(),
            },
          ]}
        >
          <Input.TextArea rows={4} placeholder={t("workflows.tasksPlaceholder")} />
        </Form.Item>
        {/* §46 表单错误在字段下方显示原因 */}
        {register.isError && (
          <p role="alert" className="mb-3 text-sm text-red-600">
            {String(register.error)}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button onClick={() => setOpen(false)}>{t("common.cancel")}</Button>
          <Button type="primary" loading={register.isPending} htmlType="submit">
            {t("workflows.register")}
          </Button>
        </div>
      </Form>
    </Card>
  );
}
