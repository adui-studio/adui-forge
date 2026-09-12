import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ListTodo, Plus } from "lucide-react";
import { useState } from "react";
import { Link, useSearchParams } from "react-router";
import { useTranslation } from "react-i18next";
import { StatusTag } from "@/components/status-tag.tsx";
import { Button, Card, Form, Input, Segmented, Select, Table } from "antd";
import type { TableColumnsType } from "antd";
import { createTask, fetchAgents, fetchTasks } from "@/lib/api.ts";
import type { TaskRecord } from "@/lib/api.ts";
import { statusKeys, statusLabel } from "@/lib/status.ts";
import { timeAgo } from "@/lib/relative-time.ts";

export function TasksPage() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const statusFilter = searchParams.get("status") ?? "all";
  const [formOpen, setFormOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: tasks, isLoading } = useQuery({
    queryKey: ["tasks"],
    queryFn: fetchTasks,
    refetchInterval: 5_000,
  });

  const columns: TableColumnsType<TaskRecord> = [
    {
      title: t("tasks.title"),
      dataIndex: "title",
      key: "title",
      render: (_, record) => (
        <Link to={`/runs/${record.runId}`} className="text-sm text-slate-200 hover:text-[#B79AEC]">
          {record.title}
        </Link>
      ),
    },
    {
      title: t("runs.colStatus"),
      dataIndex: "status",
      key: "status",
      width: 150,
      render: (_, record) => <StatusTag status={record.status} />,
    },
    {
      title: t("runs.colCreatedAt"),
      dataIndex: "createdAt",
      key: "createdAt",
      width: 180,
      render: (_, record) => (
        <span title={new Date(record.createdAt).toLocaleString()} className="text-slate-500">
          {timeAgo(record.createdAt)}
        </span>
      ),
      sorter: (a, b) => a.createdAt.localeCompare(b.createdAt),
      defaultSortOrder: "descend",
    },
  ];

  const filtered = (tasks ?? []).filter(
    (task) => statusFilter === "all" || task.status === statusFilter,
  );

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ListTodo className="h-5 w-5 text-brand-300" />
          <h1 className="text-xl font-semibold text-slate-100">{t("tasks.title")}</h1>
        </div>
        <Button
          type="primary"
          icon={<Plus className="h-3.5 w-3.5" />}
          onClick={() => setFormOpen((open) => !open)}
        >
          {formOpen ? t("tasks.collapse") : t("tasks.newTask")}
        </Button>
      </div>
      <p className="mb-4 text-sm text-slate-400">{t("tasks.subtitle")}</p>

      {formOpen && (
        <NewTaskCard
          onCreated={() => {
            setFormOpen(false);
            void queryClient.invalidateQueries({ queryKey: ["tasks"] });
            void queryClient.invalidateQueries({ queryKey: ["runs"] });
          }}
        />
      )}

      <div className="mb-3 mt-2">
        <Segmented
          value={statusFilter}
          onChange={(value) => {
            const next = new URLSearchParams(searchParams);
            if (value === "all") next.delete("status");
            else next.set("status", value);
            setSearchParams(next, { replace: true });
          }}
          options={[
            { value: "all", label: t("common.all") },
            ...statusKeys().map((value) => ({ value, label: statusLabel(value) })),
          ]}
        />
      </div>
      <Table<TaskRecord>
        columns={columns}
        dataSource={filtered}
        rowKey="id"
        loading={isLoading}
        pagination={{ pageSize: 20, showSizeChanger: false }}
        size="middle"
        locale={{
          emptyText: (
            <div className="py-6 text-center">
              <p className="text-sm text-slate-500">{t("tasks.empty")}</p>
              <Button type="link" onClick={() => setFormOpen(true)}>
                {t("tasks.emptyCta")}
              </Button>
            </div>
          ),
        }}
      />
    </>
  );
}

function NewTaskCard({ onCreated }: { onCreated: () => void }) {
  const { t } = useTranslation();
  const [form] = Form.useForm<{ title: string; task: string; agentName?: string }>();
  const { data: agents } = useQuery({
    queryKey: ["agents"],
    queryFn: fetchAgents,
    staleTime: 60_000,
  });

  const create = useMutation({
    mutationFn: (values: { title: string; task: string; agentName?: string }) =>
      createTask({
        title: values.title.trim(),
        task: values.task.trim(),
        agentName: values.agentName,
      }),
    onSuccess: onCreated,
  });

  return (
    <Card className="mb-4" title={t("tasks.formTitle")}>
      <Form
        form={form}
        layout="vertical"
        onFinish={(values) => create.mutate(values)}
        requiredMark={false}
      >
        <Form.Item
          name="title"
          label={t("tasks.titleLabel")}
          rules={[
            { required: true, message: t("tasks.titleRequired") },
            { max: 200, message: t("tasks.titleTooLong") },
          ]}
        >
          <Input placeholder={t("tasks.titlePlaceholder")} />
        </Form.Item>
        <Form.Item
          name="task"
          label={t("tasks.descLabel")}
          rules={[{ required: true, message: t("tasks.descRequired") }]}
        >
          <Input.TextArea rows={3} placeholder={t("tasks.descPlaceholder")} />
        </Form.Item>
        <Form.Item name="agentName" label={t("tasks.agentLabel")}>
          <Select
            allowClear
            placeholder={t("tasks.agentPlaceholder")}
            options={(agents ?? []).map((agent) => ({
              value: agent.name,
              label: agent.description ? `${agent.name} · ${agent.description}` : agent.name,
            }))}
            loading={agents === undefined}
          />
        </Form.Item>
        {create.isError && (
          <p role="alert" className="mb-3 text-sm text-red-600">
            {String(create.error)}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button type="primary" htmlType="submit" loading={create.isPending}>
            {t("tasks.submit")}
          </Button>
        </div>
      </Form>
    </Card>
  );
}
