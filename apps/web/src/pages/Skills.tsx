import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BookOpen, Plus, Save } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { App as AntApp, Button, Card, Empty, Form, Input, Spin, Switch, Tag } from "antd";
import { deleteSkill, fetchSkills, setSkillEnabled, upsertSkill } from "@/lib/api.ts";

/** Skills 管理页（REQUIREMENTS §35）：指令库的增删改查与启停；启用的 Skill 注入选中它的 Agent。 */
export function SkillsPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { message } = AntApp.useApp();
  const [editing, setEditing] = useState<string | null | undefined>(undefined);

  const {
    data: skills,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["skills"],
    queryFn: fetchSkills,
  });

  const toggle = useMutation({
    mutationFn: (input: { name: string; enabled: boolean }) =>
      setSkillEnabled(input.name, input.enabled),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["skills"] });
      void message.success(t("common.saved"));
    },
  });

  const remove = useMutation({
    mutationFn: (name: string) => deleteSkill(name),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["skills"] });
      void message.success(t("common.deleted"));
    },
  });

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-brand-300" />
          <h1 className="text-xl font-semibold text-slate-100">{t("skills.title")}</h1>
        </div>
        <Button
          type="primary"
          icon={<Plus className="h-3.5 w-3.5" />}
          onClick={() => setEditing(null)}
        >
          {t("skills.newSkill")}
        </Button>
      </div>
      <p className="mb-4 text-sm text-slate-400">{t("skills.subtitle")}</p>

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
      {skills !== undefined && skills.length === 0 && editing === undefined && (
        <Card>
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t("skills.empty")} />
        </Card>
      )}

      {editing === undefined && (
        <div className="grid gap-3">
          {skills?.map((skill) => (
            <Card key={skill.name} size="small">
              <div className="flex flex-wrap items-center gap-3">
                <span className="forge-code text-sm font-semibold text-slate-100">
                  {skill.name}
                </span>
                {skill.enabled ? (
                  <Tag color="green">{t("skills.enabled")}</Tag>
                ) : (
                  <Tag>{t("skills.disabled")}</Tag>
                )}
                <span className="text-sm text-slate-400">{skill.description}</span>
                <div className="ml-auto flex items-center gap-2">
                  {/* 启停开关：切换立即重建引用它的 Agent */}
                  <Switch
                    size="small"
                    checked={skill.enabled}
                    onChange={(enabled) => toggle.mutate({ name: skill.name, enabled })}
                    aria-label={t("skills.toggleAria")}
                  />
                  <Button size="small" onClick={() => setEditing(skill.name)}>
                    {t("common.edit")}
                  </Button>
                  <Button danger size="small" onClick={() => remove.mutate(skill.name)}>
                    {t("common.delete")}
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {editing !== undefined && (
        <SkillEditor editingName={editing} onClose={() => setEditing(undefined)} />
      )}

      {toggle.isError && (
        <p role="alert" className="mt-3 text-sm text-red-600">
          {String(toggle.error)}
        </p>
      )}
      {remove.isError && (
        <p role="alert" className="mt-3 text-sm text-red-600">
          {String(remove.error)}
        </p>
      )}
    </>
  );
}

function SkillEditor({
  editingName,
  onClose,
}: {
  editingName: string | null;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { message } = AntApp.useApp();
  const [form] = Form.useForm<{
    name: string;
    description: string;
    instructions: string;
  }>();

  const { data: skills, isLoading } = useQuery({
    queryKey: ["skills"],
    queryFn: fetchSkills,
  });
  const editing = editingName === null ? undefined : skills?.find((s) => s.name === editingName);

  const save = useMutation({
    mutationFn: (values: { name: string; description: string; instructions: string }) =>
      upsertSkill({
        name: values.name.trim(),
        description: values.description?.trim() ?? "",
        instructions: values.instructions,
        enabled: editing?.enabled ?? true,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["skills"] });
      void message.success(t("common.saved"));
      onClose();
    },
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spin />
      </div>
    );
  }
  if (editingName !== null && editing === undefined) {
    return <Empty description={t("skills.notFound", { name: editingName })} />;
  }

  return (
    <Card
      className="mt-4"
      title={
        editingName === null ? t("skills.newSkill") : t("skills.editTitle", { name: editingName })
      }
    >
      <Form
        form={form}
        /* key 使切换编辑对象时重置表单初值 */
        key={editingName ?? "new"}
        layout="vertical"
        requiredMark={false}
        initialValues={editing ?? { name: "", description: "", instructions: "" }}
        onFinish={(values) => save.mutate(values)}
      >
        <div className="flex flex-wrap gap-4">
          <Form.Item
            name="name"
            label={t("skills.nameLabel")}
            rules={[
              { required: true, message: t("skills.nameRequired") },
              { pattern: /^[a-z0-9-]+$/, message: t("skills.namePattern") },
            ]}
            className="w-64"
          >
            <Input placeholder="bug-fixing" disabled={editingName !== null} />
          </Form.Item>
          <Form.Item name="description" label={t("skills.descLabel")} className="flex-1">
            <Input placeholder={t("skills.descPlaceholder")} />
          </Form.Item>
        </div>
        <Form.Item
          name="instructions"
          label={t("skills.instructionsLabel")}
          rules={[{ required: true, message: t("skills.instructionsRequired") }]}
        >
          <Input.TextArea
            rows={8}
            placeholder={t("skills.instructionsPlaceholder")}
            style={{ fontFamily: "monospace" }}
          />
        </Form.Item>
        {save.isError && (
          <p role="alert" className="mb-3 text-sm text-red-600">
            {String(save.error)}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button onClick={onClose}>{t("common.cancel")}</Button>
          <Button
            type="primary"
            htmlType="submit"
            loading={save.isPending}
            icon={<Save className="h-3.5 w-3.5" />}
          >
            {t("common.save")}
          </Button>
        </div>
      </Form>
    </Card>
  );
}
