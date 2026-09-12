import { Editor, loader } from "@monaco-editor/react";
import * as monaco from "monaco-editor";
// 用 new URL(specifier, import.meta.url) 绕开 monaco exports 通配符与 ?worker 的解析冲突；
// 路径相对本文件指回 web 层 node_modules 的本地安装（ADR-004：不走 CDN）。
const createWorker = (specifier: string): Worker =>
  new Worker(new URL(specifier, import.meta.url), { type: "module" });

const editorWorker = "../../node_modules/monaco-editor/esm/vs/editor/editor.worker.js";
const cssWorker = "../../node_modules/monaco-editor/esm/vs/language/css/css.worker.js";
const htmlWorker = "../../node_modules/monaco-editor/esm/vs/language/html/html.worker.js";
const jsonWorker = "../../node_modules/monaco-editor/esm/vs/language/json/json.worker.js";
const tsWorker = "../../node_modules/monaco-editor/esm/vs/language/typescript/ts.worker.js";

import { useMutation, useQuery } from "@tanstack/react-query";
import { FolderOpen, Save } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button, Card, Empty, Spin } from "antd";
import { FileTree } from "@/components/workspace/file-tree.tsx";
import { fetchWorkspaceFile, writeWorkspaceFile } from "@/lib/workspace.ts";
import { authHeader } from "@/lib/auth.ts";

// Monaco 本地打包（ADR-004：不依赖 CDN）+ Vite worker 注入
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

/** Workspace IDE（ADR-004 阶段 2）：文件树 + Monaco 编辑器。 */
export function WorkspacePage() {
  const { t } = useTranslation();
  const [activePath, setActivePath] = useState<string | null>(null);
  const [draft, setDraft] = useState<string | null>(null);
  const [savedContent, setSavedContent] = useState<string | null>(null);

  // 未配置 FORGE_WORKSPACE_ROOT 时后端 409：探测一次以显示引导
  const { data: rootAvailable } = useQuery({
    queryKey: ["workspace-available"],
    queryFn: async (): Promise<boolean> => {
      const response = await fetch("/api/v1/workspace/tree?path=.", {
        headers: { ...authHeader() },
      });
      return response.ok;
    },
    staleTime: 30_000,
  });

  const {
    data: file,
    isLoading: fileLoading,
    isError: fileError,
  } = useQuery({
    queryKey: ["workspace-file", activePath],
    queryFn: () => fetchWorkspaceFile(activePath ?? "."),
    enabled: activePath !== null,
  });

  // 打开的文件变化时重置草稿
  const [openedFor, setOpenedFor] = useState<string | null>(null);
  if (activePath !== openedFor) {
    setOpenedFor(activePath);
    setDraft(null);
    setSavedContent(null);
  }

  const save = useMutation({
    mutationFn: () => writeWorkspaceFile(activePath ?? ".", draft ?? ""),
    onSuccess: (result) => {
      setSavedContent(result.content);
    },
  });

  const dirty = draft !== null && draft !== savedContent;
  const openFile = (path: string): void => {
    setActivePath(path);
  };

  return (
    <>
      <div className="mb-4 flex items-center gap-2">
        <FolderOpen className="h-5 w-5 text-brand-300" />
        <h1 className="text-xl font-semibold text-slate-100">{t("workspace.title")}</h1>
        {activePath !== null && (
          <span className="forge-code ml-2 text-xs text-slate-500">{activePath}</span>
        )}
        {activePath !== null && (
          <Button
            type="primary"
            size="small"
            className="ml-auto"
            icon={<Save className="h-3.5 w-3.5" />}
            loading={save.isPending}
            disabled={!dirty}
            onClick={() => save.mutate()}
          >
            {t("common.save")}
            {dirty ? " •" : ""}
          </Button>
        )}
      </div>
      <p className="mb-4 text-sm text-slate-400">{t("workspace.subtitle")}</p>

      {save.isError && (
        <p role="alert" className="mb-3 text-sm text-red-600">
          {String(save.error)}
        </p>
      )}

      {rootAvailable === false ? (
        <Card>
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <span className="text-slate-500">
                {t("workspace.unavailable")}
                <br />
                <code className="forge-code text-[#B79AEC]">FORGE_WORKSPACE_ROOT</code>
              </span>
            }
          />
        </Card>
      ) : (
        <div className="flex h-[calc(100vh-12rem)] gap-4">
          {/* Explorer */}
          <div className="w-64 shrink-0 overflow-y-auto rounded-lg border border-[#20242C] bg-[#0D0F13] py-2">
            <p className="px-2 pb-1 text-[10px] font-semibold tracking-wider text-slate-600 uppercase">
              {t("workspace.explorer")}
            </p>
            <FileTree path="." depth={0} activePath={activePath} onOpenFile={openFile} />
          </div>

          {/* Editor */}
          <div className="flex-1 overflow-hidden rounded-lg border border-[#20242C] bg-[#0D0F13]">
            {activePath === null ? (
              <div className="flex h-full items-center justify-center">
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description={<span className="text-slate-500">{t("workspace.pickFile")}</span>}
                />
              </div>
            ) : fileLoading ? (
              <div className="flex h-full items-center justify-center">
                <Spin />
              </div>
            ) : fileError || file === undefined ? (
              <div className="flex h-full items-center justify-center">
                <p className="text-sm text-red-400">{t("workspace.loadFailed")}</p>
              </div>
            ) : (
              <Editor
                key={activePath}
                height="100%"
                theme="vs-dark"
                language={monacoLanguage(activePath)}
                value={draft ?? file.content}
                onChange={(value) => setDraft(value ?? "")}
                options={{ fontSize: 13, minimap: { enabled: false }, scrollBeyondLastLine: false }}
              />
            )}
          </div>
        </div>
      )}
    </>
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
