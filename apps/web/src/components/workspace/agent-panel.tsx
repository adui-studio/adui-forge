import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Send, ShieldAlert } from "lucide-react";
import { useEffect, useReducer, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button, Tag } from "antd";
import { createRun, streamRunEvents } from "@/lib/api.ts";
import { authHeader } from "@/lib/auth.ts";

/** 面板内审批请求的认证头（云端模式复用登录态）。 */
const authHeaders = (): Record<string, string> => authHeader();
import { chatReducer, initialChatState } from "@/lib/chat.ts";
import { composeAgentTask } from "@/lib/workspace.ts";
import { getPlatformAdapter } from "@/platform/adapter.ts";

/**
 * 工作区 Agent 面板（ADR-004 阶段 4）：嵌入 IDE 布局的对话视图。
 * 数据源经 lib/api 的 runsRequest 分发——桌面端自动指向本地 Runner。
 * Trusted Local Mode 下 Shell/Git 触发的审批卡就地渲染（ADR-006 §3）。
 */
interface PendingApprovalItem {
  id: string;
  runId: string;
  toolName: string;
  input: unknown;
  reason: string;
}

export function AgentPanel({
  contextPath,
  contextContent,
}: {
  /** 当前打开的文件路径（null = 无编辑器上下文） */
  contextPath: string | null;
  /** 当前编辑器实时内容（draft 优先） */
  contextContent: string | null;
}) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [state, dispatch] = useReducer(chatReducer, initialChatState);
  const [input, setInput] = useState("");
  const [useContextFile, setUseContextFile] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  const send = useMutation({
    mutationFn: async (text: string) => {
      const composed =
        useContextFile && contextPath !== null && contextContent !== null
          ? composeAgentTask(text, { path: contextPath, content: contextContent })
          : text;
      dispatch({ type: "send", text });
      const record = await createRun(composed);
      dispatch({ type: "run-created", runId: record.id });
      return record;
    },
    onSuccess: (record) => {
      setInput("");
      void queryClient.invalidateQueries({ queryKey: ["runs"] });
      void streamRunEvents(
        record.id,
        (event) => dispatch({ type: "event", event }),
        () => void queryClient.invalidateQueries({ queryKey: ["runs"] }),
      );
    },
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [state.messages]);

  const canSend = !state.active && input.trim().length > 0 && !send.isPending;

  // —— 审批（ADR-006 §3）：轮询 pending，只显示本会话 Run 的；决策路由本地/云端 ——
  const sessionRunIds = new Set(
    state.messages
      .filter((message) => message.role === "assistant" && message.runId !== undefined)
      .map((message) => message.runId as string),
  );

  const { data: pendingAll } = useQuery({
    queryKey: ["agent-panel-approvals"],
    queryFn: async (): Promise<PendingApprovalItem[]> => {
      const runner = await getPlatformAdapter().getRunnerInfo();
      if (runner?.running === true && runner.baseUrl !== null) {
        const response = await fetch(`${runner.baseUrl}/api/v1/approvals/pending`, {
          headers: { authorization: `Bearer ${runner.token ?? ""}` },
        });
        if (!response.ok) return [];
        return (await response.json()) as PendingApprovalItem[];
      }
      // 云端模式：复用 lib/approvals 的 REST
      const response = await fetch("/api/v1/approvals/pending", { headers: authHeaders() });
      if (!response.ok) return [];
      return (await response.json()) as PendingApprovalItem[];
    },
    refetchInterval: 2_000,
  });
  const pendingMine = (pendingAll ?? []).filter((item) => sessionRunIds.has(item.runId));

  const decide = useMutation({
    mutationFn: async (input: { id: string; decision: "approved" | "rejected" }) => {
      const runner = await getPlatformAdapter().getRunnerInfo();
      if (runner?.running === true && runner.baseUrl !== null) {
        const response = await fetch(
          `${runner.baseUrl}/api/v1/approvals/${encodeURIComponent(input.id)}/decision`,
          {
            method: "POST",
            headers: {
              "content-type": "application/json",
              authorization: `Bearer ${runner.token ?? ""}`,
            },
            body: JSON.stringify({ decision: input.decision }),
          },
        );
        if (!response.ok) throw new Error(`request failed: ${response.status}`);
        return;
      }
      const response = await fetch(`/api/v1/approvals/${encodeURIComponent(input.id)}/decision`, {
        method: "POST",
        headers: { "content-type": "application/json", ...authHeaders() },
        body: JSON.stringify({ decision: input.decision }),
      });
      if (!response.ok) throw new Error(`request failed: ${response.status}`);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["agent-panel-approvals"] });
      void queryClient.invalidateQueries({ queryKey: ["runs"] });
    },
  });

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto p-3">
        {pendingMine.length > 0 && (
          <div className="mb-3 flex flex-col gap-2">
            {pendingMine.map((item) => (
              <div
                key={item.id}
                className="rounded-lg border border-amber-400/40 bg-amber-400/5 p-2"
              >
                <p className="flex items-center gap-1 text-xs font-medium text-amber-300">
                  <ShieldAlert className="h-3.5 w-3.5" /> {t("workspace.approvalTitle")}:
                  <span className="forge-code">{item.toolName}</span>
                </p>
                <pre className="forge-code mt-1 max-h-32 overflow-auto text-[10px] text-slate-300">
                  {JSON.stringify(item.input, null, 2)}
                </pre>
                <div className="mt-1.5 flex justify-end gap-1.5">
                  <Button
                    danger
                    size="small"
                    onClick={() => decide.mutate({ id: item.id, decision: "rejected" })}
                  >
                    {t("approvals.reject")}
                  </Button>
                  <Button
                    type="primary"
                    size="small"
                    onClick={() => decide.mutate({ id: item.id, decision: "approved" })}
                  >
                    {t("approvals.approve")}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {state.messages.length === 0 ? (
          <p className="text-sm text-slate-500">{t("workspace.agentPanelEmpty")}</p>
        ) : (
          <div className="flex flex-col gap-3">
            {state.messages.map((message, index) =>
              message.role === "user" ? (
                <div key={index} className="flex justify-end">
                  <div className="max-w-[90%] whitespace-pre-wrap rounded-lg border border-[#4A3A5C] bg-[#241B2E] px-3 py-2 text-xs text-slate-100">
                    {message.text}
                  </div>
                </div>
              ) : (
                <div
                  key={index}
                  className="rounded-lg border border-[#20242C] bg-[#171A21] px-3 py-2"
                >
                  {message.tools.length > 0 && (
                    <div className="mb-1.5 flex flex-wrap gap-1">
                      {message.tools.map((tool) => (
                        <Tag key={tool} className="forge-code" bordered={false}>
                          {tool}
                        </Tag>
                      ))}
                    </div>
                  )}
                  {message.text === "" && message.status === "streaming" ? (
                    <p className="forge-code text-xs text-slate-500">{t("chat.thinking")}</p>
                  ) : (
                    <pre className="forge-code text-xs whitespace-pre-wrap text-slate-100">
                      {message.text}
                    </pre>
                  )}
                  {message.status === "failed" && (
                    <p role="alert" className="mt-1 text-xs text-red-400">
                      {t("chat.failedPrefix")}
                      {message.error}
                    </p>
                  )}
                </div>
              ),
            )}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* 输入区（§60：Enter 换行，Ctrl/Cmd+Enter 发送） */}
      <div className="border-t border-[#20242C] p-2">
        {contextPath !== null && (
          <button
            type="button"
            onClick={() => setUseContextFile((on) => !on)}
            className={
              useContextFile
                ? "mb-1.5 inline-flex items-center gap-1 rounded border border-[#8B51A6] bg-[#241B2E] px-1.5 py-0.5 text-[10px] text-[#D9C7F0] forge-code"
                : "mb-1.5 inline-flex items-center gap-1 rounded border border-[#292E39] px-1.5 py-0.5 text-[10px] text-slate-500 forge-code"
            }
            title={contextPath}
          >
            {useContextFile ? "✓" : "✗"} {t("workspace.agentContext")}: {contextPath}
          </button>
        )}
        <textarea
          value={input}
          aria-label={t("workspace.agentPanelInput")}
          placeholder={t("workspace.agentPanelPlaceholder")}
          rows={3}
          disabled={state.active}
          onKeyDown={(event) => {
            if ((event.ctrlKey || event.metaKey) && event.key === "Enter" && canSend) {
              event.preventDefault();
              send.mutate(input.trim());
            }
          }}
          className="w-full resize-none rounded-md border border-[#292E39] bg-[#111318] px-2 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:border-[#8B51A6] focus:outline-none disabled:opacity-60"
          onChange={(event) => setInput(event.target.value)}
        />
        <div className="mt-1.5 flex items-center justify-between">
          <span className="text-[10px] text-slate-600">{t("workspace.agentPanelHint")}</span>
          <Button
            type="primary"
            size="small"
            icon={<Send className="h-3 w-3" />}
            disabled={!canSend}
            loading={send.isPending}
            onClick={() => send.mutate(input.trim())}
          >
            {send.isPending ? t("chat.creating") : t("chat.send")}
          </Button>
        </div>
      </div>
      {decide.isError && (
        <p role="alert" className="px-2 pb-2 text-xs text-red-400">
          {String(decide.error)}
        </p>
      )}
    </div>
  );
}
