import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronRight, File, Folder } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { fetchWorkspaceTree } from "@/lib/workspace.ts";
import type { WorkspaceEntryRecord } from "@/lib/workspace.ts";

interface FileTreeProps {
  /** 相对根的目录路径（"." 为根）。 */
  path: string;
  depth: number;
  activePath: string | null;
  onOpenFile: (path: string) => void;
}

/** 惰性文件树：目录展开时才请求子级（GET /workspace/tree）。 */
export function FileTree({ path, depth, activePath, onOpenFile }: FileTreeProps) {
  const { data: entries } = useQuery({
    queryKey: ["workspace-tree", path],
    queryFn: () => fetchWorkspaceTree(path),
    staleTime: 10_000,
  });

  if (entries === undefined) {
    return (
      <p className="px-2 py-1 text-xs text-slate-600" style={{ paddingLeft: depth * 12 + 8 }}>
        …
      </p>
    );
  }

  return (
    <ul>
      {entries.map((entry) => (
        <TreeItem
          key={`${path}/${entry.name}`}
          parentPath={path}
          entry={entry}
          depth={depth}
          activePath={activePath}
          onOpenFile={onOpenFile}
        />
      ))}
    </ul>
  );
}

function TreeItem({
  parentPath,
  entry,
  depth,
  activePath,
  onOpenFile,
}: {
  parentPath: string;
  entry: WorkspaceEntryRecord;
  depth: number;
  activePath: string | null;
  onOpenFile: (path: string) => void;
}) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const fullPath = parentPath === "." ? entry.name : `${parentPath}/${entry.name}`;
  const isActive = activePath === fullPath;

  if (entry.type === "directory") {
    return (
      <li>
        <button
          type="button"
          className="flex w-full items-center gap-1.5 rounded px-2 py-1 text-left text-sm text-slate-300 hover:bg-white/5"
          style={{ paddingLeft: depth * 12 + 8 }}
          onClick={() => setExpanded((open) => !open)}
        >
          {expanded ? (
            <ChevronDown className="h-3.5 w-3.5 shrink-0 text-slate-500" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-500" />
          )}
          <Folder className="h-3.5 w-3.5 shrink-0 text-[#B79AEC]" aria-hidden />
          <span className="truncate">{entry.name}</span>
        </button>
        {expanded && (
          <FileTree
            path={fullPath}
            depth={depth + 1}
            activePath={activePath}
            onOpenFile={onOpenFile}
          />
        )}
      </li>
    );
  }

  return (
    <li>
      <button
        type="button"
        className={
          isActive
            ? "flex w-full items-center gap-1.5 rounded bg-[#222732] px-2 py-1 text-left text-sm text-white"
            : "flex w-full items-center gap-1.5 rounded px-2 py-1 text-left text-sm text-slate-300 hover:bg-white/5"
        }
        style={{ paddingLeft: depth * 12 + 8 }}
        onClick={() => onOpenFile(fullPath)}
        title={`${t("workspace.openFile")}: ${fullPath}`}
      >
        <File className="h-3.5 w-3.5 shrink-0 text-slate-500" aria-hidden />
        <span className="truncate">{entry.name}</span>
      </button>
    </li>
  );
}
