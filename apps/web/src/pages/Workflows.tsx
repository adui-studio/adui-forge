import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Play, Plus, Workflow as WorkflowIcon } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { Button, Card, Empty, Form, Input, Spin, Steps } from "antd";
import { fetchWorkflows, runWorkflow } from "@/lib/workflows.ts";
import type { WorkflowDefinitionRecord } from "@/lib/workflows.ts";
import { registerWorkflow } from "@/lib/api.ts";

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
              {run.isPending ? t("workflows.starting") : t("workflows.run")}
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
