import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Eraser, MessageSquare, Pencil, Plus, Send, Square, Trash2 } from "lucide-react";
import { useEffect, useReducer, useRef, useState } from "react";
import {
  App as AntApp,
  Button,
  Empty,
  Input,
  Modal,
  Popconfirm,
  Select,
  Space,
  Tag,
  Tooltip,
} from "antd";
import { useTranslation } from "react-i18next";
import {
  appendConversationMessage,
  renameConversation,
  cancelRun,
  createConversation,
  createRun,
  deleteConversation,
  fetchAgents,
  fetchConversation,
  fetchConversations,
  streamRunEvents,
} from "@/lib/api.ts";
import { chatReducer, initialChatState } from "@/lib/chat.ts";

export function ChatPage() {
  const [state, dispatch] = useReducer(chatReducer, initialChatState);
  const [input, setInput] = useState("");
  const [agentName, setAgentName] = useState<string | undefined>(undefined);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const { message } = AntApp.useApp();
  // 已落库的 assistant 消息（按 runId 去重，避免终态effect重复追加）
  const appendedRunIds = useRef<Set<string>>(new Set());

  const { data: agents } = useQuery({
    queryKey: ["agents"],
    queryFn: fetchAgents,
    staleTime: 60_000,
  });
  const { data: conversations } = useQuery({
    queryKey: ["conversations"],
    queryFn: fetchConversations,
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

  /** 确保已有会话；没有则创建（标题留空，由首条用户消息补默认标题）。 */
  const ensureConversation = async (): Promise<string> => {
    if (conversationId !== null) return conversationId;
    const record = await createConversation({ agentName: agentName ?? agents?.[0]?.name ?? "" });
    setConversationId(record.id);
    void queryClient.invalidateQueries({ queryKey: ["conversations"] });
    return record.id;
  };

  const send = useMutation({
    mutationFn: async () => {
      const text = input.trim();
      const id = await ensureConversation();
      dispatch({ type: "send", text });
      await appendConversationMessage(id, { role: "user", text, status: "completed" });
      const record = await createRun(text, agentName);
      dispatch({ type: "run-created", runId: record.id });
      return record;
    },
    onSuccess: (record) => {
      setInput("");
      void queryClient.invalidateQueries({ queryKey: ["runs"] });
      void queryClient.invalidateQueries({ queryKey: ["conversations"] });
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

  // assistant 消息到达终态后落库到会话（流式文本在本地累积完成）
  useEffect(() => {
    const last = [...state.messages].reverse().find((m) => m.role === "assistant");
    if (
      last === undefined ||
      last.runId === undefined ||
      last.status === "streaming" ||
      appendedRunIds.current.has(last.runId) ||
      conversationId === null
    ) {
      return;
    }
    appendedRunIds.current.add(last.runId);
    void appendConversationMessage(conversationId, {
      role: "assistant",
      text: last.text,
      runId: last.runId,
      status: last.status,
      error: last.error,
      tools: last.tools,
    })
      .then(() => queryClient.invalidateQueries({ queryKey: ["conversations"] }))
      .catch(() => {});
  }, [state.messages, conversationId, queryClient]);

  // 切换历史会话
  const selectConversation = async (id: string): Promise<void> => {
    if (state.active) return;
    const detail = await fetchConversation(id);
    setConversationId(detail.id);
    appendedRunIds.current = new Set(
      detail.messages.filter((m) => m.runId !== undefined).map((m) => m.runId as string),
    );
    dispatch({
      type: "loaded",
      messages: detail.messages.map((m) => ({ ...m, tools: m.tools ?? [] })),
    });
  };

  const newConversation = (): void => {
    if (state.active) return;
    setConversationId(null);
    dispatch({ type: "reset" });
  };

  const removeConversation = useMutation({
    mutationFn: () => deleteConversation(conversationId ?? ""),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["conversations"] });
      void message.success(t("common.deleted"));
      newConversation();
    },
  });

  // 会话重命名
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const rename = useMutation({
    mutationFn: () => renameConversation(conversationId ?? "", renameValue.trim()),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["conversations"] });
      void message.success(t("common.saved"));
      setRenameOpen(false);
    },
  });
  const openRename = (): void => {
    const current = (conversations ?? []).find((c) => c.id === conversationId);
    setRenameValue(current?.title ?? "");
    setRenameOpen(true);
  };

  // 新消息/流式增量时滚动到底部
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [state.messages]);

  const canSend = !state.active && input.trim().length > 0 && !send.isPending;

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col">
      <div className="mb-4 flex items-center gap-2">
        <MessageSquare className="h-5 w-5 text-brand-300" />
        <h1 className="text-xl font-semibold text-slate-100">{t("chat.title")}</h1>
        <Space className="ml-auto">
          <Select
            aria-label={t("chat.historyAria")}
            value={conversationId ?? undefined}
            placeholder={t("chat.newConversation")}
            onChange={(value) => void selectConversation(value)}
            options={(conversations ?? []).slice(0, 20).map((conversation) => ({
              value: conversation.id,
              label: conversation.title === "" ? t("chat.unnamed") : conversation.title,
            }))}
            className="w-64"
            disabled={state.active}
            allowClear
            onClear={() => newConversation()}
          />
          <Tooltip title={t("chat.newConversationTitle")}>
            <Button
              type="text"
              icon={<Plus className="h-4 w-4" />}
              aria-label={t("chat.newConversationAria")}
              disabled={state.active}
              onClick={newConversation}
            />
          </Tooltip>
          {conversationId !== null && (
            <Tooltip title={t("chat.renameAria")}>
              <Button
                type="text"
                icon={<Pencil className="h-4 w-4" />}
                aria-label={t("chat.renameAria")}
                disabled={state.active}
                onClick={openRename}
              />
            </Tooltip>
          )}
          <Select
            aria-label={t("chat.agentAria")}
            value={agentName ?? agents?.[0]?.name}
            onChange={setAgentName}
            loading={agents === undefined}
            options={(agents ?? []).map((agent) => ({
              value: agent.name,
              label: agent.description ? `${agent.name} · ${agent.description}` : agent.name,
            }))}
            notFoundContent={t("home.noAgents")}
            className="w-56"
            disabled={state.active}
          />
          <Tooltip title={conversationId === null ? t("chat.clearAria") : t("chat.deleteAria")}>
            {conversationId === null ? (
              <Button
                type="text"
                icon={<Eraser className="h-4 w-4" />}
                aria-label={t("chat.clearAria")}
                disabled={state.active}
                onClick={() => dispatch({ type: "reset" })}
              />
            ) : (
              <Popconfirm
                title={t("chat.deleteTitle")}
                description={t("chat.deleteDesc")}
                okText={t("chat.deleteOk")}
                cancelText={t("common.cancel")}
                onConfirm={() => removeConversation.mutate()}
              >
                <Button
                  type="text"
                  danger
                  icon={<Trash2 className="h-4 w-4" />}
                  aria-label={t("chat.deleteAria")}
                  disabled={state.active}
                />
              </Popconfirm>
            )}
          </Tooltip>
        </Space>
      </div>
      <p className="mb-4 text-sm text-slate-400">{t("chat.subtitle")}</p>

      {/* 消息流 */}
      <div className="flex-1 overflow-y-auto rounded-lg border border-[#20242C] bg-[#0D0F13] p-4">
        {state.messages.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={
                <span className="text-slate-500">
                  {t("chat.emptyTitle")}
                  <br />
                  {t("chat.emptyExample")}
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
                      <p className="forge-code text-sm text-slate-500">{t("chat.thinking")}</p>
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
                        {t("chat.failedPrefix")}
                        {message.error}
                      </p>
                    )}
                    {message.status === "cancelled" && (
                      <p className="mt-2 text-sm text-slate-500">{t("chat.cancelled")}</p>
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
          aria-label={t("chat.inputAria")}
          placeholder={t("chat.inputPlaceholder")}
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
          <span className="text-xs text-slate-500">{t("chat.sendHint")}</span>
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
                {t("chat.stop")}
              </Button>
            )}
            <Button
              type="primary"
              icon={<Send className="h-4 w-4" />}
              disabled={!canSend}
              loading={send.isPending}
              onClick={() => send.mutate()}
            >
              {send.isPending ? t("chat.creating") : t("chat.send")}
            </Button>
          </Space>
        </div>
      </div>

      <Modal
        title={t("chat.renameTitle")}
        open={renameOpen}
        okText={t("common.save")}
        cancelText={t("common.cancel")}
        confirmLoading={rename.isPending}
        okButtonProps={{ disabled: renameValue.trim().length === 0 }}
        onOk={() => rename.mutate()}
        onCancel={() => setRenameOpen(false)}
        destroyOnHidden
      >
        <label className="text-sm text-slate-300" htmlFor="rename-input">
          {t("chat.renameLabel")}
        </label>
        <Input
          id="rename-input"
          className="mt-2"
          value={renameValue}
          placeholder={t("chat.renamePlaceholder")}
          maxLength={200}
          onChange={(event) => setRenameValue(event.target.value)}
          onPressEnter={() => {
            if (renameValue.trim().length > 0 && !rename.isPending) rename.mutate();
          }}
        />
      </Modal>
    </div>
  );
}
