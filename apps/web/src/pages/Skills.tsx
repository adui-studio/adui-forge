import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BookOpen,
  ClipboardPaste,
  Download,
  FolderInput,
  Plus,
  Save,
  Store,
  Upload,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  App as AntApp,
  Button,
  Card,
  Checkbox,
  Empty,
  Form,
  Input,
  Modal,
  Space,
  Spin,
  Switch,
  Tag,
} from "antd";
import {
  deleteSkill,
  exportSkill,
  exportSkillBundle,
  fetchBundledSkills,
  fetchSkills,
  importBundledSkill,
  importBundledSkills,
  importSkillBundle,
  importSkillMarkdown,
  importSkills,
  setSkillEnabled,
  upsertSkill,
} from "@/lib/api.ts";

/** Skills 管理页（REQUIREMENTS §35）：指令库的增删改查与启停；启用的 Skill 注入选中它的 Agent。 */
export function SkillsPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { message } = AntApp.useApp();
  const [editing, setEditing] = useState<string | null | undefined>(undefined);
  const [pasteOpen, setPasteOpen] = useState(false);
  const bundleFileRef = useRef<HTMLInputElement>(null);

  /** 技能包导出：全量 Skill 序列化为 JSON 文件下载（市场第五步）。 */
  const handleExportBundle = () => {
    void exportSkillBundle().then((bundle) => {
      const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `adui-forge-skills-${new Date().toISOString().slice(0, 10)}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
      void message.success(t("skills.bundleExportDone", { count: bundle.skills.length }));
    });
  };

  /** 技能包导入：读取 JSON 文件交给服务端逐条校验（市场第五步）。 */
  const handleImportBundleFile = (file: File) => {
    void file
      .text()
      .then((text) => {
        let bundle: unknown;
        try {
          bundle = JSON.parse(text);
        } catch {
          void message.error(t("skills.bundleImportInvalid"));
          return undefined;
        }
        return importSkillBundle(bundle).then((result) => {
          void queryClient.invalidateQueries({ queryKey: ["skills"] });
          void message.success(
            t("skills.bundleImportDone", {
              imported: result.imported.length,
              skipped: result.skipped.length,
            }),
          );
        });
      })
      .catch(() => {
        void message.error(t("skills.bundleImportInvalid"));
      });
  };

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

  const { data: bundled } = useQuery({
    queryKey: ["skills-bundled"],
    queryFn: fetchBundledSkills,
  });

  const installBundled = useMutation({
    mutationFn: () => importBundledSkills(),
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: ["skills"] });
      void message.success(t("skills.bundledDone", { count: result.imported }));
    },
  });

  const installOne = useMutation({
    mutationFn: (name: string) => importBundledSkill(name, false),
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: ["skills"] });
      if (result.ok) {
        void message.success(t("skills.marketInstalled"));
      } else {
        void message.warning(t("skills.marketModifiedWarning"));
      }
    },
  });

  const importFromDir = useMutation({
    mutationFn: () => importSkills(),
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: ["skills"] });
      if (result.ok) {
        void message.success(t("skills.importDone", { count: result.imported?.length ?? 0 }));
      } else {
        void message.warning(result.message ?? t("skills.importFail"));
      }
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
        <Space>
          <Button
            icon={<ClipboardPaste className="h-3.5 w-3.5" />}
            onClick={() => setPasteOpen(true)}
          >
            {t("skills.importMarkdown")}
          </Button>
          <Button
            icon={<FolderInput className="h-3.5 w-3.5" />}
            loading={importFromDir.isPending}
            onClick={() => importFromDir.mutate()}
          >
            {t("skills.import")}
          </Button>
          <Button
            type="primary"
            icon={<Plus className="h-3.5 w-3.5" />}
            onClick={() => setEditing(null)}
          >
            {t("skills.newSkill")}
          </Button>
        </Space>
      </div>
      <p className="mb-4 text-sm text-slate-400">{t("skills.subtitle")}</p>
      <Card
        className="mb-4"
        size="small"
        title={
          <span className="flex items-center gap-2 text-sm">
            <Store className="h-4 w-4 text-slate-500" aria-hidden />
            {t("skills.marketTitle")}
          </span>
        }
        extra={
          <Button
            size="small"
            icon={<Download className="h-3.5 w-3.5" />}
            loading={installBundled.isPending}
            onClick={() => installBundled.mutate()}
          >
            {t("skills.installBundled", { count: bundled?.length ?? 0 })}
          </Button>
        }
      >
        <p className="mb-3 text-xs text-slate-500">{t("skills.marketDesc")}</p>
        <div className="flex flex-col gap-2">
          {(bundled ?? []).map((skill) => {
            const existing = skills?.find((item) => item.name === skill.name);
            // 已安装且版本更高 → 官方更新可用；同版本内容不同 → 本地已修改
            const hasUpdate =
              existing !== undefined && (existing.bundledVersion ?? 0) < (skill.version ?? 1);
            const modified =
              existing !== undefined && !hasUpdate && existing.instructions !== skill.instructions;
            return (
              <div key={skill.name} className="flex items-center gap-3">
                <span className="forge-code text-sm text-slate-200">{skill.name}</span>
                <span className="flex-1 truncate text-xs text-slate-500">{skill.description}</span>
                {hasUpdate ? (
                  <Tag color="gold">{t("skills.marketUpdateAvailable")}</Tag>
                ) : modified ? (
                  <Tag color="gold">{t("skills.marketModified")}</Tag>
                ) : null}
                <Button
                  size="small"
                  variant={existing === undefined || hasUpdate ? "solid" : "outlined"}
                  color={existing === undefined || hasUpdate ? "primary" : "default"}
                  loading={installOne.isPending && installOne.variables === skill.name}
                  onClick={() => installOne.mutate(skill.name)}
                >
                  {existing === undefined
                    ? t("skills.marketInstall")
                    : hasUpdate
                      ? t("skills.marketUpdateAvailable")
                      : t("skills.marketUpdate")}
                </Button>
              </div>
            );
          })}
        </div>
        <div className="mt-3 flex items-center gap-2 border-t border-slate-800 pt-3">
          <span className="text-xs text-slate-500">{t("skills.bundleShare")}</span>
          <div className="ml-auto flex items-center gap-2">
            <Button
              size="small"
              icon={<Download className="h-3.5 w-3.5" />}
              onClick={handleExportBundle}
            >
              {t("skills.bundleExport")}
            </Button>
            <Button
              size="small"
              icon={<Upload className="h-3.5 w-3.5" />}
              onClick={() => bundleFileRef.current?.click()}
            >
              {t("skills.bundleImport")}
            </Button>
            <input
              ref={bundleFileRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file !== undefined) handleImportBundleFile(file);
                event.target.value = "";
              }}
            />
          </div>
        </div>
      </Card>

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
                  <Button
                    size="small"
                    icon={<Download className="h-3.5 w-3.5" />}
                    onClick={() => {
                      void exportSkill(skill.name).then((result) => {
                        // 生成 SKILL.md 并触发浏览器下载
                        const blob = new Blob([result.content], { type: "text/markdown" });
                        const url = URL.createObjectURL(blob);
                        const anchor = document.createElement("a");
                        anchor.href = url;
                        anchor.download = "SKILL.md";
                        anchor.click();
                        URL.revokeObjectURL(url);
                      });
                    }}
                  >
                    {t("skills.export")}
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

      <PasteImportModal open={pasteOpen} onClose={() => setPasteOpen(false)} />

      {toggle.isError && (
        <p role="alert" className="mt-3 text-sm text-red-600">
          {String(toggle.error)}
        </p>
      )}
      {importFromDir.isError && (
        <p role="alert" className="mt-3 text-sm text-red-600">
          {String(importFromDir.error)}
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

/** 粘贴 SKILL.md 导入对话框（市场第四步）：解析/校验/防覆盖均在服务端完成。 */
function PasteImportModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { message } = AntApp.useApp();
  const [markdown, setMarkdown] = useState("");
  const [force, setForce] = useState(false);
  const [failure, setFailure] = useState<
    { reason: "invalid"; message: string } | { reason: "exists"; name: string } | null
  >(null);

  /* 每次打开清空上次的输入与错误状态 */
  useEffect(() => {
    if (open) {
      setMarkdown("");
      setForce(false);
      setFailure(null);
    }
  }, [open]);

  const run = useMutation({
    mutationFn: (input: { markdown: string; force: boolean }) =>
      importSkillMarkdown(input.markdown, input.force),
    onSuccess: (result) => {
      if (result.ok) {
        void queryClient.invalidateQueries({ queryKey: ["skills"] });
        void message.success(t("skills.importMarkdownDone", { name: result.name }));
        onClose();
        return;
      }
      setFailure(result);
    },
  });

  return (
    <Modal
      title={t("skills.importMarkdownTitle")}
      open={open}
      onCancel={onClose}
      footer={null}
      width={640}
    >
      <Input.TextArea
        rows={12}
        value={markdown}
        onChange={(event) => {
          setMarkdown(event.target.value);
          setFailure(null);
        }}
        placeholder={t("skills.importMarkdownPlaceholder")}
        style={{ fontFamily: "monospace" }}
      />
      {failure?.reason === "invalid" && (
        <p role="alert" className="mt-3 text-sm text-red-600">
          {t("skills.importMarkdownInvalid")}：{failure.message}
        </p>
      )}
      {failure?.reason === "exists" && (
        <>
          <p role="alert" className="mt-3 text-sm text-amber-500">
            {t("skills.importMarkdownExists", { name: failure.name })}
          </p>
          <Checkbox className="mt-2" checked={force} onChange={(e) => setForce(e.target.checked)}>
            {t("skills.importMarkdownForce")}
          </Checkbox>
        </>
      )}
      <div className="mt-4 flex justify-end gap-2">
        <Button onClick={onClose}>{t("common.cancel")}</Button>
        <Button
          type="primary"
          loading={run.isPending}
          disabled={markdown.trim() === ""}
          onClick={() => run.mutate({ markdown, force })}
        >
          {t("skills.importMarkdownConfirm")}
        </Button>
      </div>
    </Modal>
  );
}
