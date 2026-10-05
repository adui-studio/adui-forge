import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  BookOpen,
  Bot,
  Loader2,
  Plug,
  Send,
  ShieldAlert,
  Workflow,
  type LucideIcon,
} from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { StatusTag } from "@/components/status-tag.tsx";
import { Button, Card, Empty, Listy, Select, Space } from "antd";
import { createRun, fetchAgents, fetchMcpServers, fetchRuns, fetchSkills } from "@/lib/api.ts";
import { fetchPendingApprovals } from "@/lib/approvals.ts";
import { fetchWorkflows } from "@/lib/workflows.ts";
import { useRunNotifications } from "@/hooks/use-run-notifications.ts";

export function HomePage() {
  const [task, setTask] = useState("");
  const { t } = useTranslation();
  const [agentName, setAgentName] = useState<string | undefined>(undefined);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: runs } = useQuery({
    queryKey: ["runs"],
    queryFn: () => fetchRuns(),
    refetchInterval: 3_000,
  });
  const { data: agents } = useQuery({
    queryKey: ["agents"],
    queryFn: fetchAgents,
    staleTime: 60_000,
  });
  const { data: pending } = useQuery({
    queryKey: ["approvals"],
    queryFn: fetchPendingApprovals,
    refetchInterval: 5_000,
  });
  // 概览统计：与其余页面共用 queryKey，缓存互通
  const { data: skills } = useQuery({
    queryKey: ["skills"],
    queryFn: fetchSkills,
    staleTime: 60_000,
  });
  const { data: workflows } = useQuery({
    queryKey: ["workflows"],
    queryFn: fetchWorkflows,
    staleTime: 60_000,
  });
  const { data: mcpServers } = useQuery({
    queryKey: ["mcp-servers"],
    queryFn: fetchMcpServers,
    staleTime: 60_000,
  });

  const mutation = useMutation({
    mutationFn: () => createRun(task, agentName),
    onSuccess: (record) => {
      setTask("");
      void queryClient.invalidateQueries({ queryKey: ["runs"] });
      void navigate(`/runs/${record.id}`);
    },
  });

  useRunNotifications(runs);

  const activeRuns = (runs ?? []).filter((run) =>
    ["running", "queued", "waiting_approval"].includes(run.status),
  );

  return (
    <>
      {/* §124/§126：Pending Approval 高优先 */}
      {pending !== undefined && pending.length > 0 && (
        <Card className="mb-4" style={{ borderColor: "rgba(245,158,11,0.4)" }}>
          <Card.Meta
            title={
              <span className="text-amber-300">
                {t("home.pendingTitle", { count: pending.length })}
              </span>
            }
            description={t("home.pendingDesc")}
          />
          <Link to="/approvals" className="text-sm text-[#B79AEC] hover:underline">
            {t("home.goApprovals")}
          </Link>
        </Card>
      )}

      <div className="mb-8">
        <h1 className="text-xl font-semibold text-slate-100">{t("home.title")}</h1>
        <p className="mt-1 text-sm text-slate-400">{t("home.subtitle")}</p>
      </div>

      {/* 概览统计：五域入口，待审批有值时高亮 */}
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-5">
        <StatCard to="/agents" label={t("home.statsAgents")} value={agents?.length} icon={Bot} />
        <StatCard
          to="/skills"
          label={t("home.statsSkills")}
          value={skills?.length}
          icon={BookOpen}
        />
        <StatCard
          to="/workflows"
          label={t("home.statsWorkflows")}
          value={workflows?.length}
          icon={Workflow}
        />
        <StatCard
          to="/mcp"
          label={t("home.statsMcp")}
          value={
            mcpServers === undefined
              ? undefined
              : `${mcpServers.filter((server) => server.status === "connected").length}/${mcpServers.length}`
          }
          icon={Plug}
        />
        <StatCard
          to="/approvals"
          label={t("home.statsPending")}
          value={pending?.length}
          icon={ShieldAlert}
          alert={(pending?.length ?? 0) > 0}
        />
      </div>

      <Card className="mb-6" title={t("home.newTask")}>
        <form
          className="flex flex-col gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            if (task.trim().length > 0) mutation.mutate();
          }}
        >
          <textarea
            value={task}
            aria-label={t("home.taskAria")}
            placeholder={t("home.taskPlaceholder")}
            rows={3}
            onKeyDown={(event) => {
              if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
                event.preventDefault();
                if (task.trim().length > 0) mutation.mutate();
              }
            }}
            className="w-full rounded-md border border-[#292E39] bg-[#111318] px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-[#8B51A6] focus:outline-none"
            onChange={(event) => setTask(event.target.value)}
          />
          <Space wrap>
            <span className="text-xs text-slate-500">{t("home.ctrlEnterHint")}</span>
            <span className="flex items-center gap-1.5">
              <span className="text-xs text-slate-500">{t("home.agentAria")}</span>
              <Select
                aria-label={t("home.agentAria")}
                value={agentName ?? agents?.[0]?.name}
                onChange={setAgentName}
                loading={agents === undefined}
                options={(agents ?? []).map((agent) => ({
                  value: agent.name,
                  label: agent.description ? `${agent.name} · ${agent.description}` : agent.name,
                }))}
                notFoundContent={t("home.noAgents")}
                className="w-52"
              />
            </span>
            <Button
              type="primary"
              htmlType="submit"
              disabled={mutation.isPending || task.trim().length === 0}
              icon={
                mutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )
              }
            >
              {mutation.isPending ? t("home.creating") : t("home.send")}
            </Button>
          </Space>
          {mutation.isError && (
            <p role="alert" className="text-sm text-red-400">
              {String(mutation.error)}
            </p>
          )}
        </form>
      </Card>

      {/* Active Runs（§124 主区域） */}
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-medium text-slate-400">{t("home.activeRuns")}</h2>
        <Link to="/runs" className="text-sm text-[#B79AEC] hover:underline">
          {t("home.viewAll")}
        </Link>
      </div>
      {activeRuns.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={
            <span className="text-slate-500">
              {t("home.emptyActiveTitle")}
              <br />
              {t("home.emptyActiveHint")}
            </span>
          }
        />
      ) : (
        <Listy
          items={activeRuns}
          rowKey={(run) => run.id}
          itemRender={(run) => (
            <Link
              to={`/runs/${run.id}`}
              className="block rounded-md border border-[#20242C] bg-[#111318] px-4 py-3 transition-colors hover:border-brand-400/40"
            >
              <Space>
                <StatusTag status={run.status} />
                <span className="text-sm text-slate-200">{run.task}</span>
              </Space>
            </Link>
          )}
        />
      )}

      {/* 最近 Runs */}
      <div className="mb-3 mt-6 flex items-center justify-between">
        <h2 className="text-sm font-medium text-slate-400">{t("home.recentRuns")}</h2>
      </div>
      {(runs ?? []).length === 0 ? (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t("home.emptyRecent")} />
      ) : (
        <Listy
          items={(runs ?? []).slice(0, 6)}
          rowKey={(run) => run.id}
          itemRender={(run) => (
            <Link
              to={`/runs/${run.id}`}
              className="block rounded-md border border-[#20242C] bg-[#111318] px-4 py-3 transition-colors hover:border-brand-400/40"
            >
              <Space>
                <StatusTag status={run.status} />
                <span className="max-w-md truncate text-sm text-slate-300">{run.task}</span>
              </Space>
            </Link>
          )}
        />
      )}
    </>
  );
}

/** 概览统计卡：图标 + 数值 + 标签，整卡可点跳转对应域页面。 */
function StatCard({
  to,
  label,
  value,
  icon: Icon,
  alert = false,
}: {
  to: string;
  label: string;
  value: number | string | undefined;
  icon: LucideIcon;
  alert?: boolean;
}) {
  return (
    <Link
      to={to}
      className={
        "flex items-center gap-3 rounded-lg border bg-[#111318] px-4 py-3 transition-colors hover:border-brand-400/40 " +
        (alert ? "border-[#B79AEC]/60" : "border-[#20242C]")
      }
    >
      <Icon
        className={"h-4 w-4 shrink-0 " + (alert ? "text-[#B79AEC]" : "text-slate-500")}
        aria-hidden
      />
      <div className="min-w-0">
        <p className="text-lg font-semibold leading-tight text-slate-100">{value ?? "—"}</p>
        <p className="truncate text-xs text-slate-500">{label}</p>
      </div>
    </Link>
  );
}
