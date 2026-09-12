import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Eraser, MessageSquare, Send, Square } from "lucide-react";
import { useEffect, useReducer, useRef, useState } from "react";
import { Button, Empty, Select, Space, Tag, Tooltip } from "antd";
import { cancelRun, createRun, fetchAgents, streamRunEvents } from "@/lib/api.ts";
import { chatReducer, initialChatState } from "@/lib/chat.ts";

export function ChatPage() {
  const [state, dispatch] = useReducer(chatReducer, initialChatState);
  const [input, setInput] = useState("");
  const [agentName, setAgentName] = useState<string | undefined>(undefined);
  const bottomRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const { data: agents } = useQuery({
    queryKey: ["agents"],
    queryFn: fetchAgents,
    staleTime: 60_000,
  });

  // 兼容无 findLast 的目标环境
  const activeRunId = [...state.messages]
    .reverse()
    .find((message) => message.role === "assistant" && message.status === "streaming")?.runId;

  const cancel = useMutation({
    mutationFn: () => cancelRun(activeRunId ?? ""),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["runs"] });
    },
  });

  const send = useMutation({
    mutationFn: async () => {
      const text = input.trim();
      dispatch({ type: "send", text });
      const record = await createRun(text, agentName);
      dispatch({ type: "run-created", runId: record.id });
      return record;
    },
    onSuccess: (record) => {
      setInput("");
      void queryClient.invalidateQueries({ queryKey: ["runs"] });
      streamRunEvents(
        record.id,
        (event) => dispatch({ type: "event", event }),
        () => {
          void queryClient.invalidateQueries({ queryKey: ["runs"] });
          void queryClient.invalidateQueries({ queryKey: ["memory"] });
        },
      );
    },
  });

  // 新消息/流式增量时滚动到底部
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [state.messages]);

  const canSend = !state.active && input.trim().length > 0 && !send.isPending;

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col">
      <div className="mb-4 flex items-center gap-2">
        <MessageSquare className="h-5 w-5 text-brand-300" />
        <h1 className="text-xl font-semibold text-slate-100">Chat</h1>
        <Space className="ml-auto">
          <Select
            aria-label="选择对话使用的 Agent"
            value={agentName ?? agents?.[0]?.name}
            onChange={setAgentName}
            loading={agents === undefined}
            options={(agents ?? []).map((agent) => ({
              value: agent.name,
              label: agent.description ? `${agent.name} · ${agent.description}` : agent.name,
            }))}
            notFoundContent="暂无可用 Agent"
            className="w-56"
            disabled={state.active}
          />
          <Tooltip title="清空对话">
            <Button
              type="text"
              icon={<Eraser className="h-4 w-4" />}
              aria-label="清空对话"
              disabled={state.active}
              onClick={() => dispatch({ type: "reset" })}
            />
          </Tooltip>
        </Space>
      </div>
      <p className="mb-4 text-sm text-slate-400">
        每条消息作为一个独立 Run 执行；会话记忆会自动注入上下文，形成连续对话。
      </p>

      {/* 消息流 */}
      <div className="flex-1 overflow-y-auto rounded-lg border border-[#20242C] bg-[#0D0F13] p-4">
        {state.messages.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={
                <span className="text-slate-500">
                  向 Agent 提问或下达指令。
                  <br />
                  例如：“分析 runs 模块的代码结构，指出可以改进的地方”。
                </span>
              }
            />
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {state.messages.map((message, index) =>
              message.role === "user" ? (
                <div key={index} className="flex justify-end">
                  <div className="max-w-[80%] whitespace-pre-wrap rounded-lg border border-[#4A3A5C] bg-[#241B2E] px-4 py-2.5 text-sm text-slate-100">
                    {message.text}
                  </div>
                </div>
              ) : (
                <div key={index} className="flex justify-start">
                  <div className="max-w-[85%] rounded-lg border border-[#20242C] bg-[#171A21] px-4 py-3">
                    {message.tools.length > 0 && (
                      <div className="mb-2 flex flex-wrap gap-1">
                        {message.tools.map((tool) => (
                          <Tag key={tool} className="forge-code" bordered={false}>
                            {tool}
                          </Tag>
                        ))}
                      </div>
                    )}
                    {message.text === "" && message.status === "streaming" ? (
                      <p className="forge-code text-sm text-slate-500">思考中…</p>
                    ) : (
                      <pre className="forge-code text-sm whitespace-pre-wrap text-slate-100">
                        {message.text}
                      </pre>
                    )}
                    {message.status === "streaming" && message.text !== "" && (
                      <span className="forge-code animate-pulse text-sm text-brand-300">▍</span>
                    )}
                    {message.status === "failed" && (
                      <p role="alert" className="mt-2 text-sm text-red-400">
                        执行失败：{message.error}
                      </p>
                    )}
                    {message.status === "cancelled" && (
                      <p className="mt-2 text-sm text-slate-500">已取消。</p>
                    )}
                  </div>
                </div>
              ),
            )}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* 输入区（§60：Enter 换行，Ctrl/Cmd+Enter 发送） */}
      <div className="mt-3">
        <textarea
          value={input}
          aria-label="对话输入"
          placeholder="输入消息，例如：帮我审查最近的代码改动…"
          rows={3}
          disabled={state.active}
          onKeyDown={(event) => {
            if ((event.ctrlKey || event.metaKey) && event.key === "Enter" && canSend) {
              event.preventDefault();
              send.mutate();
            }
          }}
          className="w-full resize-none rounded-md border border-[#292E39] bg-[#111318] px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-[#8B51A6] focus:outline-none disabled:opacity-60"
          onChange={(event) => setInput(event.target.value)}
        />
        <div className="mt-2 flex items-center justify-between">
          <span className="text-xs text-slate-500">Ctrl + Enter 发送 · Enter 换行</span>
          <Space>
            {state.active && activeRunId !== undefined && (
              <Button
                danger
                variant="outlined"
                size="small"
                icon={<Square className="h-3.5 w-3.5" />}
                loading={cancel.isPending}
                onClick={() => cancel.mutate()}
              >
                停止
              </Button>
            )}
            <Button
              type="primary"
              icon={<Send className="h-4 w-4" />}
              disabled={!canSend}
              loading={send.isPending}
              onClick={() => send.mutate()}
            >
              {send.isPending ? "创建中…" : "发送"}
            </Button>
          </Space>
        </div>
      </div>
    </div>
  );
}
