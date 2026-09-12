import { useQuery } from "@tanstack/react-query";
import { Brain } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import { StatusTag } from "@/components/status-tag.tsx";
import { Card, Empty, Listy, Spin } from "antd";
import { fetchMemory } from "@/lib/api.ts";
import { timeAgo } from "@/lib/relative-time.ts";

const AGENTS = ["forge-dev"];

export function MemoryPage() {
  const { t } = useTranslation();
  const [agent] = useState(AGENTS[0]);
  const {
    data: records,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["memory", agent],
    queryFn: () => fetchMemory(agent),
    refetchInterval: 10_000,
  });

  return (
    <>
      <div className="mb-6 flex items-center gap-2">
        <Brain className="h-5 w-5 text-accent-300" />
        <h1 className="text-xl font-semibold text-slate-100">{t("memory.title")}</h1>
      </div>
      <p className="mb-6 text-sm text-slate-400">{t("memory.subtitle")}</p>

      {isLoading && (
        <div className="flex justify-center py-12">
          <Spin />
        </div>
      )}
      {isError && (
        <p role="alert" className="text-sm text-red-600">
          {String(error)}
        </p>
      )}
      {records === undefined || records.length === 0 ? (
        <Card>
          <Empty description={t("memory.empty")} />
        </Card>
      ) : (
        <Listy
          items={records}
          rowKey={(record) => `${record.recordedAt}-${record.task}`}
          itemRender={(record) => (
            <div className="rounded-lg border border-[#20242C] bg-[#111318] p-4">
              <div className="flex items-center gap-2">
                <StatusTag status={record.status} />
                <span className="flex-1 truncate text-sm font-medium text-slate-200">
                  {record.task}
                </span>
                <span
                  title={new Date(record.recordedAt).toLocaleString()}
                  className="text-xs text-slate-500"
                >
                  {timeAgo(record.recordedAt)}
                </span>
              </div>
              {record.summary.length > 0 && (
                <p className="mt-2 line-clamp-2 text-sm text-slate-400">{record.summary}</p>
              )}
            </div>
          )}
        />
      )}
    </>
  );
}
