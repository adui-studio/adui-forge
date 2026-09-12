import { useQuery } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router";
import { useTranslation } from "react-i18next";
import { StatusTag } from "@/components/status-tag.tsx";
import { Segmented, Table, type TableColumnsType } from "antd";
import { fetchRuns } from "@/lib/api.ts";
import type { RunRecord } from "@/lib/api.ts";
import { statusKeys, statusLabel } from "@/lib/status.ts";
import { timeAgo } from "@/lib/relative-time.ts";

export function RunsPage() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const statusFilter = searchParams.get("status") ?? "all";
  const { data: runs, isLoading } = useQuery({
    queryKey: ["runs"],
    queryFn: fetchRuns,
    refetchInterval: 2_000,
  });

  const columns: TableColumnsType<RunRecord> = [
    {
      title: t("runs.colStatus"),
      dataIndex: "status",
      key: "status",
      width: 150,
      render: (_, record) => <StatusTag status={record.status} />,
    },
    {
      title: t("runs.colTask"),
      dataIndex: "task",
      key: "task",
      render: (_, record) => (
        <Link to={`/runs/${record.id}`} className="text-sm text-slate-200 hover:text-[#B79AEC]">
          {record.task}
        </Link>
      ),
    },
    { title: "Agent", dataIndex: "agentName", key: "agentName", width: 180 },
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

  const filtered = (runs ?? []).filter(
    (run) => statusFilter === "all" || run.status === statusFilter,
  );

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-100">Runs</h1>
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
              <p className="text-sm text-slate-500">{t("runs.empty")}</p>
              <Link to="/" className="mt-2 inline-block text-sm text-[#B79AEC] hover:underline">
                {t("runs.emptyCta")}
              </Link>
            </div>
          ),
        }}
      />
    </>
  );
}
