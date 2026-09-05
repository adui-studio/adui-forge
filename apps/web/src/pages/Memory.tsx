import { useQuery } from "@tanstack/react-query";
import { Brain } from "lucide-react";
import { useState } from "react";
import { StatusTag } from "@/components/status-tag.tsx";
import { Card, Empty, Listy } from "antd";
import { fetchMemory } from "@/lib/api.ts";
import { timeAgo } from "@/lib/relative-time.ts";

const AGENTS = ["forge-dev"];

export function MemoryPage() {
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
        <h1 className="text-xl font-semibold text-slate-100">Session Memory</h1>
      </div>
      <p className="mb-6 text-sm text-slate-400">
        Agent 每次运行的任务与结果摘要会记录在此，并注入后续任务的系统提示，形成会话连续性。
      </p>

      {isLoading && <p className="text-sm text-slate-500">加载中…</p>}
      {isError && (
        <p role="alert" className="text-sm text-red-600">
          {String(error)}
        </p>
      )}
      {records === undefined || records.length === 0 ? (
        <Card>
          <Empty description="还没有记忆记录——完成一次 Run 后这里会出现任务摘要" />
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
