import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Send } from "lucide-react";
import { useEffect, useReducer, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button, Tag } from "antd";
import { createRun, streamRunEvents } from "@/lib/api.ts";
import { chatReducer, initialChatState } from "@/lib/chat.ts";
import { composeAgentTask } from "@/lib/workspace.ts";

/**
 * 工作区 Agent 面板（ADR-004 阶段 4）：嵌入 IDE 布局的对话视图。
 * 数据源经 lib/api 的 runsRequest 分发——桌面端自动指向本地 Runner。
 */
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

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto p-3">
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
    </div>
  );
}
