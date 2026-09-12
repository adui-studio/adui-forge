import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Bot, Save, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { useTranslation } from "react-i18next";
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
import {
  deleteAgent,
  fetchAgent,
  fetchAgentModels,
  fetchAgentToolPool,
  fetchSkills,
  upsertAgent,
} from "@/lib/api.ts";

/** Agent 详情：内置 Agent 只读展示，自定义 Agent 可编辑（name/systemPrompt/tools/loop）。 */
export function AgentDetailPage() {
  const { name = "new" } = useParams();
  const isNew = name === "new";
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t } = useTranslation();
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

  const { data: modelCatalog } = useQuery({
    queryKey: ["agent-models"],
    queryFn: fetchAgentModels,
    staleTime: 60_000,
  });

  const { data: skills } = useQuery({
    queryKey: ["skills"],
    queryFn: fetchSkills,
    staleTime: 60_000,
  });

  const [draft, setDraft] = useState({
    name: "",
    description: "",
    systemPrompt: "",
    model: "",
    skills: [] as string[],
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
        model: agent.model,
        skills: agent.skills ?? [],
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
        model: draft.model,
        skills: draft.skills,
        tools: draft.tools,
        maxSteps: draft.maxSteps,
        timeoutMs: draft.timeoutMs,
      }),
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: ["agents"] });
      void queryClient.invalidateQueries({ queryKey: ["agent", result.name] });
      void message.success(t("common.saved"));
      if (result.name !== name) {
        void navigate(`/agents/${result.name}`, { replace: true });
      }
    },
  });

  const remove = useMutation({
    mutationFn: () => deleteAgent(draft.name),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["agents"] });
      void message.success(t("common.deleted"));
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
    return <Empty description={t("agentDetail.notFound", { name })} />;
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
        <ArrowLeft className="h-4 w-4" /> {t("common.backList")}
      </Link>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <Bot className="h-5 w-5 text-brand-300" />
        <h1 className="font-mono text-xl font-semibold text-slate-100">
          {isNew ? t("agentDetail.newTitle") : draft.name}
        </h1>
        {agent?.source === "builtin" && (
          <Tag className="forge-code">{t("agentDetail.builtinTag")}</Tag>
        )}
        {agent?.source === "custom" && (
          <Tag className="forge-code" color="purple">
            {t("agentDetail.customTag")}
          </Tag>
        )}
        {isCustom && (
          <div className="ml-auto flex items-center gap-2">
            {!isNew && (
              <Popconfirm
                title={t("agentDetail.deleteTitle", { name: draft.name })}
                description={t("agentDetail.deleteDesc")}
                okText={t("common.delete")}
                cancelText={t("common.cancel")}
                onConfirm={() => remove.mutate()}
              >
                <Button danger variant="outlined" icon={<Trash2 className="h-3.5 w-3.5" />}>
                  {t("common.delete")}
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
              {t("common.save")}
            </Button>
          </div>
        )}
      </div>
      {!isNew && !isCustom && (
        <p className="mt-2 text-xs text-slate-500">{t("agentDetail.builtinHint")}</p>
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

      <Card className="mt-4" title={t("agentDetail.baseDef")}>
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-4">
            <label className="flex flex-col gap-1 text-sm text-slate-300">
              {t("agentDetail.nameLabel")}
              <Input
                value={draft.name}
                disabled={!isCustom}
                placeholder={t("agentDetail.namePlaceholder")}
                className="w-64"
                onChange={(event) => setDraft({ ...draft, name: event.target.value })}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm text-slate-300">
              {t("agentDetail.descLabel")}
              <Input
                value={draft.description}
                disabled={!isCustom}
                placeholder={t("agentDetail.descPlaceholder")}
                className="w-96"
                onChange={(event) => setDraft({ ...draft, description: event.target.value })}
              />
            </label>
          </div>
          <label className="flex flex-col gap-1 text-sm text-slate-300">
            {t("agentDetail.systemPromptLabel")}
            <Input.TextArea
              value={draft.systemPrompt}
              disabled={!isCustom}
              rows={6}
              placeholder={t("agentDetail.systemPromptPlaceholder")}
              onChange={(event) => setDraft({ ...draft, systemPrompt: event.target.value })}
            />
          </label>
        </div>
      </Card>

      <Card className="mt-4" title={t("agentDetail.toolsLoop")}>
        <div className="flex flex-col gap-4">
          <div>
            <p className="mb-2 text-sm text-slate-300">{t("agentDetail.toolsTitle")}</p>
            <Select
              mode="multiple"
              value={draft.tools}
              disabled={!isCustom}
              placeholder={t("agentDetail.toolsPlaceholder")}
              className="w-full"
              options={(toolPool ?? agent?.availableTools ?? []).map((tool) => ({
                value: tool,
                label: tool,
              }))}
              onChange={(value) => setDraft({ ...draft, tools: value })}
            />
            <p className="mt-1 text-xs text-slate-500">{t("agentDetail.toolsHint")}</p>
          </div>
          <div>
            <label htmlFor="agent-skills" className="text-sm text-slate-300">
              {t("skills.title")}
            </label>
            <Select
              id="agent-skills"
              mode="multiple"
              value={draft.skills}
              disabled={!isCustom}
              placeholder={t("agentDetail.skillsPlaceholder")}
              className="w-full"
              options={(skills ?? []).map((skill) => ({
                value: skill.name,
                label: `${skill.name} · ${skill.description}`,
              }))}
              onChange={(value) => setDraft({ ...draft, skills: value })}
            />
            <p className="mt-1 text-xs text-slate-500">{t("agentDetail.skillsHint")}</p>
          </div>
          <div>
            <label htmlFor="agent-model" className="text-sm text-slate-300">
              {t("agentDetail.modelLabel")}
            </label>
            <Select
              id="agent-model"
              value={draft.model === "" ? (modelCatalog?.default ?? undefined) : draft.model}
              disabled={!isCustom}
              className="mt-1 w-96"
              options={[
                ...(modelCatalog?.default !== null && modelCatalog?.default !== undefined
                  ? [
                      {
                        value: modelCatalog.default,
                        label: t("agentDetail.modelDefault", { name: modelCatalog.default }),
                      },
                    ]
                  : []),
                ...(modelCatalog?.models ?? [])
                  .filter((model) => model.name !== modelCatalog?.default)
                  .map((model) => ({
                    value: model.name,
                    label: `${model.name} · ${model.provider} / ${model.modelId}`,
                  })),
              ]}
              onChange={(value) =>
                setDraft({ ...draft, model: value === modelCatalog?.default ? "" : value })
              }
            />
            <p className="mt-1 text-xs text-slate-500">{t("agentDetail.modelHint")}</p>
          </div>
          <div className="flex flex-wrap gap-4">
            <label className="flex flex-col gap-1 text-sm text-slate-300">
              {t("agentDetail.maxStepsLabel")}
              <InputNumber
                value={draft.maxSteps}
                min={1}
                max={64}
                disabled={!isCustom}
                onChange={(value) => setDraft({ ...draft, maxSteps: value ?? 16 })}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm text-slate-300">
              {t("agentDetail.timeoutLabel")}
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
