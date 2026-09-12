import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { Empty } from "antd";
import { useTranslation } from "react-i18next";
import { fetchRuns } from "@/lib/api.ts";
import { fetchWorkflows } from "@/lib/workflows.ts";
import { runWorkflow } from "@/lib/workflows.ts";
import { filterCommands, type CommandItem } from "@/lib/command-palette.ts";
import { cn } from "@/lib/utils.ts";

/** 命令面板(DesignGuidelines §41-43):Ctrl/Cmd+K 唤起,过滤/上下键/Enter/Esc。 */
export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const { data: runs } = useQuery({
    queryKey: ["runs"],
    queryFn: fetchRuns,
    enabled: open,
  });
  const { data: workflows } = useQuery({
    queryKey: ["workflows"],
    queryFn: fetchWorkflows,
    enabled: open,
  });

  const pages = useMemo(
    () =>
      [
        { to: "/", labelKey: "nav.dashboard", keywords: "dashboard home 首页 控制台 dashboard" },
        { to: "/runs", labelKey: "nav.runs", keywords: "runs 执行 记录 列表 runs" },
        { to: "/tasks", labelKey: "nav.tasks", keywords: "tasks 任务 台账 工作单元 tasks" },
        { to: "/chat", labelKey: "nav.chat", keywords: "chat 对话 聊天 agent chat" },
        { to: "/agents", labelKey: "nav.agents", keywords: "agents 工具 agents" },
        { to: "/workflows", labelKey: "nav.workflows", keywords: "workflows 编排 workflows" },
        { to: "/mcp", labelKey: "nav.mcp", keywords: "mcp servers 服务 工具桥接 mcp" },
        { to: "/approvals", labelKey: "nav.approvals", keywords: "approvals 批准 approvals" },
        { to: "/memory", labelKey: "nav.memory", keywords: "memory 记忆 摘要 memory" },
        { to: "/settings", labelKey: "nav.settings", keywords: "settings 设置 配置 settings" },
      ].map((page) => ({
        id: `page-${page.to.slice(1) || "dashboard"}`,
        to: page.to,
        category: "palette.categoryPages",
        label: t(page.labelKey),
        keywords: page.keywords,
        run: () => {},
      })),
    [t],
  );

  const commands = useMemo<CommandItem[]>(() => {
    const goto = (to: string) => () => {
      void navigate(to);
      onClose();
    };
    const runPageCommands: CommandItem[] = pages.map((page) => ({
      ...page,
      run: goto(page.to),
    }));
    const workflowCommands: CommandItem[] = (workflows ?? []).map((workflow) => ({
      id: `wf-${workflow.name}`,
      category: "palette.categoryWorkflow",
      label: `${t("workflows.run")} ${workflow.name}`,
      hint: t("palette.categoryWorkflow"),
      keywords: `${workflow.name} ${workflow.description} workflow run`,
      run: () => {
        void runWorkflow(workflow.name)
          .then((record) => {
            void navigate(`/runs/${record.id}`);
            onClose();
          })
          .catch(() => {});
      },
    }));
    const runCommands: CommandItem[] = (runs ?? []).slice(0, 10).map((run) => ({
      id: `run-${run.id}`,
      category: "palette.categoryRun",
      label: run.task,
      hint: run.status,
      keywords: `${run.id} ${run.task}`,
      run: () => {
        void navigate(`/runs/${run.id}`);
        onClose();
      },
    }));
    return [...runPageCommands, ...workflowCommands, ...runCommands];
  }, [pages, workflows, runs, navigate, onClose]);

  const filtered = useMemo(() => filterCommands(commands, query), [commands, query]);

  // 重置高亮
  useEffect(() => {
    setHighlight(0);
  }, [query]);

  // 打开时聚焦
  useEffect(() => {
    if (open) {
      setQuery("");
      setHighlight(0);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  const execute = (command: CommandItem | undefined): void => {
    if (command === undefined) return;
    onClose();
    command.run();
  };

  const onKeyDown = (event: React.KeyboardEvent): void => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlight((previous) => Math.min(previous + 1, filtered.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlight((previous) => Math.max(previous - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      execute(filtered[highlight]);
    } else if (event.key === "Escape") {
      onClose();
    }
  };

  // 高亮项滚动进可视区
  useEffect(() => {
    listRef.current
      ?.querySelector(`[data-index="${highlight}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [highlight]);

  if (!open) return null;

  let lastCategory = "";

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 pt-[12vh] backdrop-blur-sm"
      onMouseDown={onClose}
    >
      <div
        className="w-full max-w-xl overflow-hidden rounded-xl border border-[#292E39] bg-[#111318] shadow-[0_8px_30px_rgba(0,0,0,0.5)]"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-[#20242C] px-4">
          <Search className="h-4 w-4 text-slate-500" />
          <input
            ref={inputRef}
            value={query}
            placeholder={t("palette.placeholder")}
            className="h-12 w-full bg-transparent text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none"
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={onKeyDown}
          />
          <span className="rounded border border-[#292E39] px-1.5 py-0.5 font-mono text-[10px] text-slate-500">
            ESC
          </span>
        </div>
        <div ref={listRef} className="max-h-80 overflow-auto p-2">
          {filtered.length === 0 && (
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t("palette.noResult")} />
          )}
          {filtered.map((command, index) => {
            const header = command.category !== lastCategory ? command.category : null;
            lastCategory = command.category;
            return (
              <div key={command.id} data-index={index}>
                {header !== null && (
                  <p className="px-2 pb-1 pt-2 text-[10px] font-semibold tracking-wider text-slate-500 uppercase">
                    {t(header)}
                  </p>
                )}
                <button
                  type="button"
                  className={cn(
                    "flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm transition-colors",
                    index === highlight
                      ? "bg-[#222732] text-white"
                      : "text-slate-300 hover:bg-white/5",
                  )}
                  onMouseEnter={() => setHighlight(index)}
                  onClick={() => execute(command)}
                >
                  <span className="truncate">{command.label}</span>
                  {command.hint !== undefined && (
                    <span className="ml-2 shrink-0 text-xs text-slate-500">{command.hint}</span>
                  )}
                </button>
              </div>
            );
          })}
        </div>
        <div className="flex items-center gap-3 border-t border-[#20242C] px-4 py-2 text-[10px] text-slate-500">
          <span>{t("palette.hintSelect")}</span>
          <span>{t("palette.hintExecute")}</span>
          <span>{t("palette.hintClose")}</span>
        </div>
      </div>
    </div>
  );
}
