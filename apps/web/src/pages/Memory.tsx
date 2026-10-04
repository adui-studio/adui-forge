import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Brain } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import { App as AntApp, Button, Card, Empty, Listy, Popconfirm, Spin, Switch } from "antd";
import { StatusTag } from "@/components/status-tag.tsx";
import {
  clearMemory,
  deleteMemoryRecord,
  fetchMemory,
  fetchMemoryEnabled,
  setMemoryEnabled,
} from "@/lib/api.ts";
import { timeAgo } from "@/lib/relative-time.ts";

const AGENTS = ["forge-dev"];

/** Session Memory 管理页（AGENTS §49：可查看 / 可删除 / 可清空 / 可关闭）。 */
export function MemoryPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { message } = AntApp.useApp();
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

  const { data: enabled } = useQuery({
    queryKey: ["memory-enabled"],
    queryFn: fetchMemoryEnabled,
  });

  const invalidate = (): void => {
    void queryClient.invalidateQueries({ queryKey: ["memory"] });
    void queryClient.invalidateQueries({ queryKey: ["memory-enabled"] });
  };

  const remove = useMutation({
    mutationFn: (id: string) => deleteMemoryRecord(id),
    onSuccess: () => {
      invalidate();
      void message.success(t("common.deleted"));
    },
  });

  const clear = useMutation({
    mutationFn: () => clearMemory(agent),
    onSuccess: (removed) => {
      invalidate();
      void message.success(t("memory.cleared", { count: removed }));
    },
  });

  const toggle = useMutation({
    mutationFn: (next: boolean) => setMemoryEnabled(next),
    onSuccess: () => {
      invalidate();
    },
  });

  return (
    <>
      <div className="mb-6 flex items-center gap-2">
        <Brain className="h-5 w-5 text-accent-300" />
        <h1 className="text-xl font-semibold text-slate-100">{t("memory.title")}</h1>
        <div className="ml-auto flex items-center gap-3">
          {/* §49 可关闭：停用后不再记录也不再注入 */}
          <span className="text-sm text-slate-400">{t("memory.enabledLabel")}</span>
          <Switch
            size="small"
            checked={enabled ?? true}
            onChange={(next) => toggle.mutate(next)}
            aria-label={t("memory.enabledLabel")}
          />
          <Popconfirm
            title={t("memory.clearConfirm")}
            okText={t("common.delete")}
            cancelText={t("common.cancel")}
            onConfirm={() => clear.mutate()}
          >
            <Button danger size="small" disabled={(records ?? []).length === 0}>
              {t("memory.clearAll")}
            </Button>
          </Popconfirm>
        </div>
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
          rowKey={(record) => record.id}
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
                <Button
                  danger
                  type="text"
                  size="small"
                  onClick={() => remove.mutate(record.id)}
                  aria-label={t("common.delete")}
                >
                  {t("common.delete")}
                </Button>
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
