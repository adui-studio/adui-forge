import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate, useSearchParams } from "react-router";
import { useTranslation } from "react-i18next";
import { StatusTag } from "@/components/status-tag.tsx";
import { Segmented, Select, Table, type TableColumnsType } from "antd";
import { fetchRuns } from "@/lib/api.ts";
import type { RunRecord } from "@/lib/api.ts";
import { statusKeys, statusLabel } from "@/lib/status.ts";
import { timeAgo } from "@/lib/relative-time.ts";

export function RunsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const statusFilter = searchParams.get("status") ?? "all";
  const agentFilter = searchParams.get("agent") ?? "all";
  const { data: runs, isLoading } = useQuery({
    queryKey: ["runs"],
    queryFn: fetchRuns,
    refetchInterval: 2_000,
  });

  // 筛选状态写入 URL，可分享/刷新还原
  const setFilter = (key: string, value: string): void => {
    const next = new URLSearchParams(searchParams);
    if (value === "all") next.delete(key);
    else next.set(key, value);
    setSearchParams(next, { replace: true });
  };

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
    { title: t("runs.colAgent"), dataIndex: "agentName", key: "agentName", width: 180 },
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

  const agentOptions = [...new Set((runs ?? []).map((run) => run.agentName))].sort();
  const filtered = (runs ?? []).filter(
    (run) =>
      (statusFilter === "all" || run.status === statusFilter) &&
      (agentFilter === "all" || run.agentName === agentFilter),
  );

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-semibold text-slate-100">{t("runs.title")}</h1>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Select
            aria-label={t("runs.agentFilter")}
            value={agentFilter}
            options={[
              { value: "all", label: t("runs.agentAll") },
              ...agentOptions.map((name) => ({ value: name, label: name })),
            ]}
            onChange={(value) => setFilter("agent", value)}
            className="w-44"
            showSearch
          />
          <Segmented
            value={statusFilter}
            onChange={(value) => setFilter("status", value)}
            options={[
              { value: "all", label: t("common.all") },
              ...statusKeys().map((value) => ({ value, label: statusLabel(value) })),
            ]}
          />
        </div>
      </div>
      <Table<RunRecord>
        columns={columns}
        dataSource={filtered}
        rowKey="id"
        onRow={(record) => ({
          onClick: () => void navigate(`/runs/${record.id}`),
          className: "cursor-pointer",
        })}
        loading={isLoading}
        pagination={{ pageSize: 20, showSizeChanger: false }}
        size="middle"
        locale={{
          emptyText: (
            <div className="py-6 text-center">
              <p className="text-sm text-slate-500">{t("runs.emptyFiltered")}</p>
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
