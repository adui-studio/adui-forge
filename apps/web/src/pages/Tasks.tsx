import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ListTodo, Plus } from "lucide-react";
import { useState } from "react";
import { Link, useSearchParams } from "react-router";
import { StatusTag } from "@/components/status-tag.tsx";
import { Button, Card, Form, Input, Segmented, Select, Table } from "antd";
import type { TableColumnsType } from "antd";
import { createTask, fetchAgents, fetchTasks } from "@/lib/api.ts";
import type { TaskRecord } from "@/lib/api.ts";
import { STATUS_LABEL } from "@/lib/status.ts";
import { timeAgo } from "@/lib/relative-time.ts";

export function TasksPage() {
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
      title: "任务",
      dataIndex: "title",
      key: "title",
      render: (_, record) => (
        <Link to={`/runs/${record.runId}`} className="text-sm text-slate-200 hover:text-[#B79AEC]">
          {record.title}
        </Link>
      ),
    },
    {
      title: "状态",
      dataIndex: "status",
      key: "status",
      width: 150,
      render: (_, record) => <StatusTag status={record.status} />,
    },
    {
      title: "创建时间",
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
          <h1 className="text-xl font-semibold text-slate-100">任务</h1>
        </div>
        <Button
          type="primary"
          icon={<Plus className="h-3.5 w-3.5" />}
          onClick={() => setFormOpen((open) => !open)}
        >
          {formOpen ? "收起表单" : "新建任务"}
        </Button>
      </div>
      <p className="mb-4 text-sm text-slate-400">
        任务是面向人的工作单元：创建后立即派生一个 Run 执行，可随时回到这里跟踪进度。
      </p>

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
            { value: "all", label: "全部" },
            ...Object.entries(STATUS_LABEL).map(([value, label]) => ({ value, label })),
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
              <p className="text-sm text-slate-500">还没有任务。</p>
              <Button type="link" onClick={() => setFormOpen(true)}>
                新建第一个任务 →
              </Button>
            </div>
          ),
        }}
      />
    </>
  );
}

function NewTaskCard({ onCreated }: { onCreated: () => void }) {
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
    <Card className="mb-4" title="新建任务">
      <Form
        form={form}
        layout="vertical"
        onFinish={(values) => create.mutate(values)}
        requiredMark={false}
      >
        <Form.Item
          name="title"
          label="标题"
          rules={[
            { required: true, message: "标题不能为空" },
            { max: 200, message: "标题最长 200 字" },
          ]}
        >
          <Input placeholder="给用户列表增加搜索功能" />
        </Form.Item>
        <Form.Item
          name="task"
          label="任务描述"
          rules={[{ required: true, message: "任务描述不能为空" }]}
        >
          <Input.TextArea
            rows={3}
            placeholder="描述要完成的工作，例如：为用户列表增加关键字搜索并补充组件测试"
          />
        </Form.Item>
        <Form.Item name="agentName" label="Agent（可选，默认 forge-dev）">
          <Select
            allowClear
            placeholder="选择执行此次任务的 Agent"
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
            创建并执行
          </Button>
        </div>
      </Form>
    </Card>
  );
}
