import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DiffEditor, Editor, loader } from "@monaco-editor/react";
import * as monaco from "monaco-editor";
import { Bot, FolderGit2, FolderOpen, Plus, Save, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  App as AntApp,
  Button,
  Card,
  Empty,
  Form,
  Input,
  Modal,
  Popconfirm,
  Spin,
  Tag,
} from "antd";
import { AgentPanel } from "@/components/workspace/agent-panel.tsx";
import { FileTree } from "@/components/workspace/file-tree.tsx";
import {
  commitGit,
  fetchGitOriginal,
  deleteWorkspaceFile,
  fetchGitStatus,
  fetchWorkspaceFile,
  writeWorkspaceFile,
} from "@/lib/workspace.ts";
import { getPlatformAdapter, type RunnerInfo } from "@/platform/adapter.ts";
import { fetchWorkspaceTree } from "@/lib/workspace.ts";

// 用 new URL(specifier, import.meta.url) 绕开 monaco exports 通配符与 ?worker 的解析冲突；
// 路径相对本文件指回 web 层 node_modules 的本地安装（ADR-004：不走 CDN）。
const createWorker = (specifier: string): Worker =>
  new Worker(new URL(specifier, import.meta.url), { type: "module" });

const editorWorker = "../../node_modules/monaco-editor/esm/vs/editor/editor.worker.js";
const cssWorker = "../../node_modules/monaco-editor/esm/vs/language/css/css.worker.js";
const htmlWorker = "../../node_modules/monaco-editor/esm/vs/language/html/html.worker.js";
const jsonWorker = "../../node_modules/monaco-editor/esm/vs/language/json/json.worker.js";
const tsWorker = "../../node_modules/monaco-editor/esm/vs/language/typescript/ts.worker.js";

(
  self as unknown as { MonacoEnvironment: { getWorker: (id: string, label: string) => Worker } }
).MonacoEnvironment = {
  getWorker(_workerId: string, label: string): Worker {
    if (label === "json") return createWorker(jsonWorker);
    if (label === "css" || label === "scss" || label === "less") return createWorker(cssWorker);
    if (label === "html" || label === "handlebars" || label === "razor")
      return createWorker(htmlWorker);
    if (label === "typescript" || label === "javascript") return createWorker(tsWorker);
    return createWorker(editorWorker);
  },
};
loader.config({ monaco });

/** 打开的编辑器 Tab：saved 为服务端最新内容，draft 为编辑中内容（null = 未修改）。 */
interface EditorTab {
  path: string;
  saved: string;
  draft: string | null;
}

const tabDirty = (tab: EditorTab): boolean => tab.draft !== null && tab.draft !== tab.saved;

/** Workspace IDE（ADR-004 阶段 2）：多 Tab 文件树 + Monaco 编辑器 + 新建/删除文件。 */
export function WorkspacePage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { message } = AntApp.useApp();
  const [tabs, setTabs] = useState<EditorTab[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [newFileOpen, setNewFileOpen] = useState(false);
  const [showGit, setShowGit] = useState(false);
  const [showAgentPanel, setShowAgentPanel] = useState(false);
  const [gitMessage, setGitMessage] = useState("");

  const { data: gitStatus, refetch: refetchGit } = useQuery({
    queryKey: ["workspace-git"],
    queryFn: fetchGitStatus,
    enabled: showGit,
  });
  const [diffPath, setDiffPath] = useState<string | null>(null);
  const { data: diffData } = useQuery({
    queryKey: ["workspace-git-diff", diffPath],
    queryFn: async () => {
      if (diffPath === null) return null;
      const [original, current] = await Promise.all([
        fetchGitOriginal(diffPath),
        fetchWorkspaceFile(diffPath),
      ]);
      return { original: original.content, tracked: original.tracked, current: current.content };
    },
    enabled: diffPath !== null,
  });

  const [runner, setRunner] = useState<RunnerInfo | null>(null);
  const [runnerRoot, setRunnerRoot] = useState(
    () => globalThis.localStorage?.getItem("forge.runnerRoot") ?? "",
  );
  const [platform, setPlatform] = useState<"web" | "desktop">("web");
  useEffect(() => {
    void getPlatformAdapter()
      .getPlatformInfo()
      .then((info) => setPlatform(info.platform));
    void getPlatformAdapter()
      .getRunnerInfo()
      .then((info) => setRunner(info));
  }, []);

  // 可用性探测：桌面端先看 Runner（路由经 lib/workspace 的 workspaceBase），云端走 API
  const { data: rootAvailable, refetch: refetchAvailable } = useQuery({
    queryKey: ["workspace-available", runner?.baseUrl],
    queryFn: async (): Promise<boolean> => {
      const info = await getPlatformAdapter().getRunnerInfo();
      if (info?.running === true && info.baseUrl !== null) {
        setRunner(info);
      }
      try {
        await fetchWorkspaceTree(".");
        return true;
      } catch {
        return false;
      }
    },
    staleTime: 5_000,
  });

  const startRunner = async (): Promise<void> => {
    globalThis.localStorage?.setItem("forge.runnerRoot", runnerRoot);
    // dev 接线：runner_cwd 与 entry 由桌面端 localStorage 提供（ADR-005 阶段 3 dev 约定）
    const runnerCwd = globalThis.localStorage?.getItem("forge.runnerCwd") ?? "apps/runner";
    const entry = globalThis.localStorage?.getItem("forge.runnerEntry") ?? "src/index.ts";
    await getPlatformAdapter().startRunner(runnerRoot, runnerCwd, entry);
    // 端口经 stdout 异步解析：轮询至就绪（上限 ~5s）
    for (let attempt = 0; attempt < 10; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      const info = await getPlatformAdapter().getRunnerInfo();
      if (info?.running === true && info.baseUrl !== null) {
        setRunner(info);
        break;
      }
    }
    await refetchAvailable();
  };

  const openFile = async (path: string): Promise<void> => {
    const existing = tabs.findIndex((tab) => tab.path === path);
    if (existing !== -1) {
      setActiveIndex(existing);
      return;
    }
    try {
      const file = await fetchWorkspaceFile(path);
      setTabs((current) => [...current, { path, saved: file.content, draft: null }]);
      setActiveIndex(tabs.length);
    } catch (error) {
      void message.error(String(error));
    }
  };

  const closeTab = (index: number): void => {
    setTabs((current) => current.filter((_, i) => i !== index));
    setActiveIndex((current) => (current >= index ? Math.max(0, current - 1) : current));
  };

  const activeTab = tabs[activeIndex];
  const updateDraft = (value: string): void => {
    setTabs((current) =>
      current.map((tab, i) => (i === activeIndex ? { ...tab, draft: value } : tab)),
    );
  };

  const save = useMutation({
    mutationFn: async () => {
      if (activeTab === undefined) return null;
      return writeWorkspaceFile(activeTab.path, activeTab.draft ?? activeTab.saved);
    },
    onSuccess: (result) => {
      if (result === null) return;
      setTabs((current) =>
        current.map((tab, i) =>
          i === activeIndex ? { ...tab, saved: result.content, draft: null } : tab,
        ),
      );
      void message.success(t("common.saved"));
    },
  });

  const createFile = useMutation({
    mutationFn: (path: string) => writeWorkspaceFile(path, ""),
    onSuccess: (_result, path) => {
      void queryClient.invalidateQueries({ queryKey: ["workspace-tree"] });
      setNewFileOpen(false);
      void openFile(path);
    },
  });

  const removeFile = useMutation({
    mutationFn: (path: string) => deleteWorkspaceFile(path),
    onSuccess: (_result, path) => {
      const index = tabs.findIndex((tab) => tab.path === path);
      if (index !== -1) closeTab(index);
      void queryClient.invalidateQueries({ queryKey: ["workspace-tree"] });
      void message.success(t("common.deleted"));
    },
  });

  const commit = useMutation({
    mutationFn: () => {
      const paths = (gitStatus?.changes ?? []).map((change) => change.path);
      return commitGit(gitMessage, paths);
    },
    onSuccess: () => {
      void message.success(t("workspace.gitCommitted"));
      setGitMessage("");
      setDiffPath(null);
      void refetchGit();
    },
  });

  return (
    <>
      <div className="mb-4 flex items-center gap-2">
        <FolderOpen className="h-5 w-5 text-brand-300" />
        <h1 className="text-xl font-semibold text-slate-100">{t("workspace.title")}</h1>
        <Button
          size="small"
          className="ml-auto"
          variant={showAgentPanel ? "solid" : "outlined"}
          color={showAgentPanel ? "primary" : "default"}
          icon={<Bot className="h-3.5 w-3.5" />}
          onClick={() => setShowAgentPanel((open) => !open)}
        >
          {t("workspace.agentPanelTitle")}
        </Button>
        <Button
          size="small"
          icon={<FolderGit2 className="h-3.5 w-3.5" />}
          onClick={() => setShowGit((open) => !open)}
        >
          Git
        </Button>
        <Button
          size="small"
          icon={<Plus className="h-3.5 w-3.5" />}
          onClick={() => setNewFileOpen(true)}
        >
          {t("workspace.newFile")}
        </Button>
      </div>
      <p className="mb-4 text-sm text-slate-400">{t("workspace.subtitle")}</p>

      {save.isError && (
        <p role="alert" className="mb-3 text-sm text-red-600">
          {String(save.error)}
        </p>
      )}
      {createFile.isError && (
        <p role="alert" className="mb-3 text-sm text-red-600">
          {String(createFile.error)}
        </p>
      )}

      {rootAvailable === false ? (
        <Card>
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <span className="text-slate-500">
                {platform === "desktop"
                  ? t("workspace.runnerLaunchHint")
                  : t("workspace.unavailable")}
              </span>
            }
          >
            {platform === "desktop" && (
              <div className="mt-3 flex items-center justify-center gap-2">
                <Input
                  value={runnerRoot}
                  placeholder="D:/projects/my-app"
                  className="max-w-sm"
                  onChange={(event) => setRunnerRoot(event.target.value)}
                />
                <Button
                  type="primary"
                  disabled={runnerRoot.trim().length === 0}
                  onClick={() => void startRunner()}
                >
                  {t("workspace.runnerStart")}
                </Button>
              </div>
            )}
          </Empty>
        </Card>
      ) : (
        <div className="flex h-[calc(100vh-12rem)] gap-4">
          {/* Explorer */}
          <div className="w-64 shrink-0 overflow-y-auto rounded-lg border border-[#20242C] bg-[#0D0F13] py-2">
            <p className="px-2 pb-1 text-[10px] font-semibold tracking-wider text-slate-600 uppercase">
              {t("workspace.explorer")}
            </p>
            <FileTree
              path="."
              depth={0}
              activePath={activeTab?.path ?? null}
              onOpenFile={(path) => void openFile(path)}
            />
          </div>

          {/* Editor + Tabs */}
          <div className="flex flex-1 flex-col overflow-hidden rounded-lg border border-[#20242C] bg-[#0D0F13]">
            {tabs.length === 0 ? (
              <div className="flex h-full items-center justify-center">
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description={<span className="text-slate-500">{t("workspace.pickFile")}</span>}
                />
              </div>
            ) : (
              <>
                {/* Tab 栏 */}
                <div className="flex items-center overflow-x-auto border-b border-[#20242C]">
                  {tabs.map((tab, index) => (
                    <div
                      key={tab.path}
                      className={
                        index === activeIndex
                          ? "flex items-center gap-1.5 border-b-2 border-[#8B51A6] px-3 py-2 text-sm text-white"
                          : "flex items-center gap-1.5 border-b-2 border-transparent px-3 py-2 text-sm text-slate-400 hover:text-slate-200"
                      }
                    >
                      <button
                        type="button"
                        className="forge-code max-w-48 truncate"
                        onClick={() => setActiveIndex(index)}
                      >
                        {tab.path}
                        {tabDirty(tab) ? " •" : ""}
                      </button>
                      <button
                        type="button"
                        aria-label={t("workspace.closeTab")}
                        className="text-slate-500 hover:text-slate-200"
                        onClick={() => closeTab(index)}
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                  {activeTab !== undefined && (
                    <div className="ml-auto flex items-center gap-1 px-2">
                      <Popconfirm
                        title={t("workspace.deleteFileTitle", { path: activeTab.path })}
                        okText={t("common.delete")}
                        cancelText={t("common.cancel")}
                        onConfirm={() => removeFile.mutate(activeTab.path)}
                      >
                        <Button danger size="small" variant="outlined">
                          {t("common.delete")}
                        </Button>
                      </Popconfirm>
                      <Button
                        type="primary"
                        size="small"
                        icon={<Save className="h-3.5 w-3.5" />}
                        loading={save.isPending}
                        disabled={!tabDirty(activeTab)}
                        onClick={() => save.mutate()}
                      >
                        {t("common.save")}
                      </Button>
                    </div>
                  )}
                </div>

                {/* Diff 视图（点 Git 变更文件打开，关闭按钮返回编辑） */}
                {diffPath !== null && diffData !== undefined && (
                  <div className="flex h-full flex-col">
                    <div className="flex items-center gap-2 border-b border-[#20242C] px-3 py-1.5">
                      <span className="forge-code text-xs text-slate-400">
                        {t("workspace.diffTitle", { path: diffPath })}
                      </span>
                      {diffData?.tracked ? null : (
                        <Tag color="purple">{t("workspace.diffUntracked")}</Tag>
                      )}
                      <Button size="small" className="ml-auto" onClick={() => setDiffPath(null)}>
                        {t("workspace.closeDiff")}
                      </Button>
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <DiffEditor
                        height="100%"
                        theme="vs-dark"
                        language={monacoLanguage(diffPath)}
                        original={diffData?.original ?? ""}
                        modified={diffData?.current ?? ""}
                        options={{ readOnly: true, renderSideBySide: true, fontSize: 13 }}
                      />
                    </div>
                  </div>
                )}
                {diffPath === null && activeTab !== undefined && (
                  <div className="flex-1 overflow-hidden">
                    <Editor
                      key={activeTab.path}
                      height="100%"
                      theme="vs-dark"
                      language={monacoLanguage(activeTab.path)}
                      value={activeTab.draft ?? activeTab.saved}
                      onChange={(value) => updateDraft(value ?? "")}
                      options={{
                        fontSize: 13,
                        minimap: { enabled: false },
                        scrollBeyondLastLine: false,
                      }}
                    />
                  </div>
                )}
              </>
            )}
            {/* Agent 面板列（编辑器右侧，主容器内） */}
            {showAgentPanel && (
              <div className="w-80 shrink-0 overflow-hidden rounded-lg border border-[#20242C] bg-[#0D0F13]">
                <AgentPanel
                  contextPath={activeTab?.path ?? null}
                  contextContent={
                    activeTab === undefined ? null : (activeTab.draft ?? activeTab.saved)
                  }
                />
              </div>
            )}
          </div>
        </div>
      )}

      {showGit && rootAvailable === true && (
        <Card className="mt-4" size="small" title={t("workspace.gitTitle")}>
          {gitStatus === undefined ? (
            <Spin />
          ) : (
            <div className="flex flex-col gap-3">
              <p className="forge-code text-xs text-slate-500">
                {t("workspace.gitBranch")}: {gitStatus.branch} · {t("workspace.gitChanges")}:{" "}
                {gitStatus.changes.length}
              </p>
              {gitStatus.changes.length === 0 ? (
                <p className="text-sm text-slate-500">{t("workspace.gitClean")}</p>
              ) : (
                <>
                  <div className="flex flex-wrap gap-1.5">
                    {gitStatus.changes.map((change) => (
                      <Tag
                        key={change.path}
                        className="forge-code cursor-pointer"
                        bordered={false}
                        color={diffPath === change.path ? "purple" : undefined}
                        onClick={() => setDiffPath(change.path)}
                      >
                        {change.code} {change.path}
                      </Tag>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      value={gitMessage}
                      placeholder={t("workspace.gitMessagePlaceholder")}
                      className="max-w-md"
                      onChange={(event) => setGitMessage(event.target.value)}
                    />
                    <Button
                      type="primary"
                      size="small"
                      disabled={gitMessage.trim() === "" || commit.isPending}
                      loading={commit.isPending}
                      onClick={() => commit.mutate()}
                    >
                      {t("workspace.gitCommit")}
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}
        </Card>
      )}

      <NewFileModal
        open={newFileOpen}
        creating={createFile.isPending}
        onClose={() => setNewFileOpen(false)}
        onCreate={(path) => createFile.mutate(path)}
      />
    </>
  );
}

function NewFileModal({
  open,
  creating,
  onClose,
  onCreate,
}: {
  open: boolean;
  creating: boolean;
  onClose: () => void;
  onCreate: (path: string) => void;
}) {
  const { t } = useTranslation();
  const [form] = Form.useForm<{ path: string }>();
  return (
    <Modal
      title={t("workspace.newFile")}
      open={open}
      okText={t("workspace.create")}
      cancelText={t("common.cancel")}
      confirmLoading={creating}
      destroyOnHidden
      onOk={() => {
        form
          .validateFields()
          .then((values) => onCreate(values.path.trim()))
          .catch(() => {});
      }}
      onCancel={onClose}
    >
      <Form form={form} layout="vertical" requiredMark={false}>
        <Form.Item
          name="path"
          label={t("workspace.newFileLabel")}
          rules={[
            { required: true, message: t("workspace.newFileRequired") },
            {
              pattern: /^[a-zA-Z0-9_\-./]+$/,
              message: t("workspace.newFilePattern"),
            },
          ]}
          extra={t("workspace.newFileExtra")}
        >
          <Input placeholder="src/utils/format.ts" />
        </Form.Item>
      </Form>
    </Modal>
  );
}

/** 按扩展名映射 Monaco 语言；未知回退 plaintext。 */
const monacoLanguage = (path: string): string => {
  const extension = path.slice(path.lastIndexOf(".") + 1).toLowerCase();
  const map: Record<string, string> = {
    ts: "typescript",
    tsx: "typescript",
    js: "javascript",
    jsx: "javascript",
    mjs: "javascript",
    json: "json",
    css: "css",
    scss: "scss",
    less: "less",
    html: "html",
    md: "markdown",
    yml: "yaml",
    yaml: "yaml",
    rs: "rust",
    py: "python",
    dart: "dart",
    sql: "sql",
    sh: "shell",
    prisma: "graphql",
  };
  return map[extension] ?? "plaintext";
};
