import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useNavigate } from "react-router";
import { StatusTag } from "@/components/status-tag.tsx";
import { Segmented, Table, type TableColumnsType } from "antd";
import { fetchRuns } from "@/lib/api.ts";
import type { RunRecord } from "@/lib/api.ts";
import { STATUS_LABEL } from "@/lib/status.ts";
import { timeAgo } from "@/lib/relative-time.ts";

export function RunsPage() {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const { data: runs, isLoading } = useQuery({
    queryKey: ["runs"],
    queryFn: fetchRuns,
    refetchInterval: 2_000,
  });

  const columns: TableColumnsType<RunRecord> = [
    {
      title: "状态",
      dataIndex: "status",
      key: "status",
      width: 150,
      render: (_, record) => <StatusTag status={record.status} />,
    },
    {
      title: "任务",
      dataIndex: "task",
      key: "task",
      render: (_, record) => (
        <a
          onClick={() => navigate(`/runs/${record.id}`)}
          className="cursor-pointer text-sm text-slate-200 hover:text-[#B79AEC]"
        >
          {record.task}
        </a>
      ),
    },
    { title: "Agent", dataIndex: "agentName", key: "agentName", width: 180 },
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

  const filtered = (runs ?? []).filter(
    (run) => statusFilter === "all" || run.status === statusFilter,
  );

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-100">Runs</h1>
        <Segmented
          value={statusFilter}
          onChange={(value) => setStatusFilter(value as string)}
          options={[
            { value: "all", label: "全部" },
            ...Object.entries(STATUS_LABEL).map(([value, label]) => ({ value, label })),
          ]}
        />
      </div>
      <Table<RunRecord>
        columns={columns}
        dataSource={filtered}
        rowKey="id"
        loading={isLoading}
        pagination={{ pageSize: 20, showSizeChanger: false }}
        size="middle"
        locale={{
          emptyText: (
            <div className="py-6 text-center">
              <p className="text-sm text-slate-500">还没有 Run。</p>
              <a href="/" className="mt-2 inline-block text-sm text-[#B79AEC] hover:underline">
                去控制台发起第一个任务 →
              </a>
            </div>
          ),
        }}
      />
    </>
  );
}
