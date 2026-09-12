import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Bot, Save, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import {
  App as AntApp,
  Button,
  Card,
  Empty,
  Input,
  InputNumber,
  Popconfirm,
  Select,
  Spin,
  Tag,
} from "antd";
import { deleteAgent, fetchAgent, fetchAgentToolPool, upsertAgent } from "@/lib/api.ts";

/** Agent 详情：内置 Agent 只读展示，自定义 Agent 可编辑（name/systemPrompt/tools/loop）。 */
export function AgentDetailPage() {
  const { name = "new" } = useParams();
  const isNew = name === "new";
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { message } = AntApp.useApp();

  const { data: agent, isLoading } = useQuery({
    queryKey: ["agent", name],
    queryFn: () => fetchAgent(name),
    enabled: !isNew,
  });

  const { data: toolPool } = useQuery({
    queryKey: ["agent-tools"],
    queryFn: fetchAgentToolPool,
  });

  const [draft, setDraft] = useState({
    name: "",
    description: "",
    systemPrompt: "",
    tools: [] as string[],
    maxSteps: 16,
    timeoutMs: 300_000,
  });
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (agent !== undefined && !loaded) {
      setDraft({
        name: agent.name,
        description: agent.description,
        systemPrompt: agent.systemPrompt,
        tools: agent.tools,
        maxSteps: agent.loop.maxSteps,
        timeoutMs: agent.loop.timeoutMs,
      });
      setLoaded(true);
    }
  }, [agent, loaded]);

  const save = useMutation({
    mutationFn: () =>
      upsertAgent({
        name: draft.name.trim(),
        description: draft.description.trim(),
        systemPrompt: draft.systemPrompt,
        tools: draft.tools,
        maxSteps: draft.maxSteps,
        timeoutMs: draft.timeoutMs,
      }),
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: ["agents"] });
      void queryClient.invalidateQueries({ queryKey: ["agent", result.name] });
      void message.success("已保存");
      if (result.name !== name) {
        void navigate(`/agents/${result.name}`, { replace: true });
      }
    },
  });

  const remove = useMutation({
    mutationFn: () => deleteAgent(draft.name),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["agents"] });
      void message.success("已删除");
      void navigate("/agents");
    },
  });

  if (!isNew && isLoading) {
    return (
      <div className="flex justify-center py-24">
        <Spin />
      </div>
    );
  }
  if (!isNew && agent === undefined) {
    return <Empty description={`未找到 Agent "${name}"`} />;
  }

  const isCustom = isNew || agent?.source === "custom";
  const nameValid = /^[a-z0-9-]+$/.test(draft.name.trim());
  const canSave =
    isCustom &&
    nameValid &&
    draft.systemPrompt.trim().length > 0 &&
    draft.maxSteps >= 1 &&
    draft.timeoutMs >= 1_000 &&
    !save.isPending;

  return (
    <>
      <Link
        to="/agents"
        className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-brand-300"
      >
        <ArrowLeft className="h-4 w-4" /> 返回列表
      </Link>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <Bot className="h-5 w-5 text-brand-300" />
        <h1 className="font-mono text-xl font-semibold text-slate-100">
          {isNew ? "新建 Agent" : draft.name}
        </h1>
        {agent?.source === "builtin" && <Tag className="forge-code">内置 · 只读</Tag>}
        {agent?.source === "custom" && (
          <Tag className="forge-code" color="purple">
            自定义
          </Tag>
        )}
        {isCustom && (
          <div className="ml-auto flex items-center gap-2">
            {!isNew && (
              <Popconfirm
                title={`删除 Agent "${draft.name}"？`}
                description="删除后使用该 Agent 的请求将返回 404。"
                okText="删除"
                cancelText="取消"
                onConfirm={() => remove.mutate()}
              >
                <Button danger variant="outlined" icon={<Trash2 className="h-3.5 w-3.5" />}>
                  删除
                </Button>
              </Popconfirm>
            )}
            <Button
              type="primary"
              icon={<Save className="h-4 w-4" />}
              loading={save.isPending}
              disabled={!canSave}
              onClick={() => save.mutate()}
            >
              保存
            </Button>
          </div>
        )}
      </div>
      {!isNew && !isCustom && (
        <p className="mt-2 text-xs text-slate-500">
          内置 Agent 由环境变量与代码定义，如需定制请创建自定义 Agent。
        </p>
      )}
      {save.isError && (
        <p role="alert" className="mt-2 text-sm text-red-600">
          {String(save.error)}
        </p>
      )}
      {remove.isError && (
        <p role="alert" className="mt-2 text-sm text-red-600">
          {String(remove.error)}
        </p>
      )}

      <Card className="mt-4" title="基本定义">
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-4">
            <label className="flex flex-col gap-1 text-sm text-slate-300">
              名称（kebab-case）
              <Input
                value={draft.name}
                disabled={!isCustom}
                placeholder="code-reviewer"
                className="w-64"
                onChange={(event) => setDraft({ ...draft, name: event.target.value })}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm text-slate-300">
              描述
              <Input
                value={draft.description}
                disabled={!isCustom}
                placeholder="一句话说明该 Agent 的职责"
                className="w-96"
                onChange={(event) => setDraft({ ...draft, description: event.target.value })}
              />
            </label>
          </div>
          <label className="flex flex-col gap-1 text-sm text-slate-300">
            系统提示词（System Prompt）
            <Input.TextArea
              value={draft.systemPrompt}
              disabled={!isCustom}
              rows={6}
              placeholder="定义 Agent 的角色、行为准则与输出要求…"
              onChange={(event) => setDraft({ ...draft, systemPrompt: event.target.value })}
            />
          </label>
        </div>
      </Card>

      <Card className="mt-4" title="工具与循环限制">
        <div className="flex flex-col gap-4">
          <div>
            <p className="mb-2 text-sm text-slate-300">工具集（从启动工具池中选择）</p>
            <Select
              mode="multiple"
              value={draft.tools}
              disabled={!isCustom}
              placeholder="选择该 Agent 可用的工具"
              className="w-full"
              options={(toolPool ?? agent?.availableTools ?? []).map((tool) => ({
                value: tool,
                label: tool,
              }))}
              onChange={(value) => setDraft({ ...draft, tools: value })}
            />
            <p className="mt-1 text-xs text-slate-500">
              shell_exec / git 写入类工具为 approval 权限，执行时会触发人工审批。
            </p>
          </div>
          <div className="flex flex-wrap gap-4">
            <label className="flex flex-col gap-1 text-sm text-slate-300">
              最大步数（maxSteps）
              <InputNumber
                value={draft.maxSteps}
                min={1}
                max={64}
                disabled={!isCustom}
                onChange={(value) => setDraft({ ...draft, maxSteps: value ?? 16 })}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm text-slate-300">
              超时（毫秒）
              <InputNumber
                value={draft.timeoutMs}
                min={1_000}
                max={600_000}
                step={10_000}
                disabled={!isCustom}
                onChange={(value) => setDraft({ ...draft, timeoutMs: value ?? 300_000 })}
              />
            </label>
          </div>
        </div>
      </Card>
    </>
  );
}
