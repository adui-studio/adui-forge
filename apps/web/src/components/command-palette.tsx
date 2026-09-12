import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { Empty } from "antd";
import { fetchRuns } from "@/lib/api.ts";
import { fetchWorkflows } from "@/lib/workflows.ts";
import { runWorkflow } from "@/lib/workflows.ts";
import { filterCommands, type CommandItem } from "@/lib/command-palette.ts";
import { cn } from "@/lib/utils.ts";

const PAGES: Array<CommandItem & { to: string }> = [
  {
    id: "page-dashboard",
    to: "/",
    category: "页面",
    label: "控制台",
    keywords: "dashboard home 首页 控制台",
    run: () => {},
  },
  {
    id: "page-runs",
    to: "/runs",
    category: "页面",
    label: "Runs",
    keywords: "runs 执行 记录 列表",
    run: () => {},
  },
  {
    id: "page-tasks",
    to: "/tasks",
    category: "页面",
    label: "任务",
    keywords: "tasks 任务 台账 工作单元",
    run: () => {},
  },
  {
    id: "page-chat",
    to: "/chat",
    category: "页面",
    label: "Chat",
    keywords: "chat 对话 聊天 agent",
    run: () => {},
  },
  {
    id: "page-agents",
    to: "/agents",
    category: "页面",
    label: "Agents",
    keywords: "agents 工具",
    run: () => {},
  },
  {
    id: "page-workflows",
    to: "/workflows",
    category: "页面",
    label: "Workflows",
    keywords: "workflows 编排",
    run: () => {},
  },
  {
    id: "page-mcp",
    to: "/mcp",
    category: "页面",
    label: "MCP Servers",
    keywords: "mcp servers 服务 工具桥接",
    run: () => {},
  },
  {
    id: "page-approvals",
    to: "/approvals",
    category: "页面",
    label: "审批",
    keywords: "approvals 批准",
    run: () => {},
  },
  {
    id: "page-memory",
    to: "/memory",
    category: "页面",
    label: "记忆",
    keywords: "memory 记忆 摘要",
    run: () => {},
  },
  {
    id: "page-settings",
    to: "/settings",
    category: "页面",
    label: "设置",
    keywords: "settings 设置 配置",
    run: () => {},
  },
];

/** 命令面板(DesignGuidelines §41-43):Ctrl/Cmd+K 唤起,过滤/上下键/Enter/Esc。 */
export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
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

  const commands = useMemo<CommandItem[]>(() => {
    const goto = (to: string) => () => {
      void navigate(to);
      onClose();
    };
    const runPageCommands: CommandItem[] = PAGES.map((page) => ({
      ...page,
      run: goto(page.to),
    }));
    const workflowCommands: CommandItem[] = (workflows ?? []).map((workflow) => ({
      id: `wf-${workflow.name}`,
      category: "Workflow",
      label: `运行 ${workflow.name}`,
      hint: "Workflow",
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
      category: "Run",
      label: run.task,
      hint: run.status,
      keywords: `${run.id} ${run.task}`,
      run: () => {
        void navigate(`/runs/${run.id}`);
        onClose();
      },
    }));
    return [...runPageCommands, ...workflowCommands, ...runCommands];
  }, [workflows, runs, navigate, onClose]);

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
            placeholder="搜索页面、Workflow、Run…"
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
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="无匹配结果" />
          )}
          {filtered.map((command, index) => {
            const header = command.category !== lastCategory ? command.category : null;
            lastCategory = command.category;
            return (
              <div key={command.id} data-index={index}>
                {header !== null && (
                  <p className="px-2 pb-1 pt-2 text-[10px] font-semibold tracking-wider text-slate-500 uppercase">
                    {header}
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
          <span>↑↓ 选择</span>
          <span>↵ 执行</span>
          <span>ESC 关闭</span>
        </div>
      </div>
    </div>
  );
}
