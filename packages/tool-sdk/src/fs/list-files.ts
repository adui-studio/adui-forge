import { readdirSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import { defineTool } from "../define.ts";
import { resolveInWorkspace } from "./boundary.ts";

export interface ListFilesToolOptions {
  root: string;
  /** 递归最大深度，默认 8。 */
  maxDepth?: number;
  /** 返回条目上限，默认 2000。 */
  maxEntries?: number;
}

const SKIPPED_DIRECTORIES = new Set(["node_modules", ".git", "dist", "doc_build"]);

const walk = (
  absoluteDir: string,
  relativeDir: string,
  depth: number,
  options: Required<ListFilesToolOptions>,
  out: string[],
): void => {
  if (out.length >= options.maxEntries || depth > options.maxDepth) {
    return;
  }
  for (const entry of readdirSync(absoluteDir, { withFileTypes: true })) {
    if (out.length >= options.maxEntries) {
      return;
    }
    const relativePath = relativeDir === "" ? entry.name : `${relativeDir}/${entry.name}`;
    if (entry.isDirectory()) {
      if (SKIPPED_DIRECTORIES.has(entry.name)) {
        continue;
      }
      out.push(`${relativePath}/`);
      walk(join(absoluteDir, entry.name), relativePath, depth + 1, options, out);
    } else if (entry.isFile()) {
      out.push(relativePath);
    }
  }
};

export const createListFilesTool = (options: ListFilesToolOptions) => {
  const resolvedOptions: Required<ListFilesToolOptions> = {
    root: options.root,
    maxDepth: options.maxDepth ?? 8,
    maxEntries: options.maxEntries ?? 2000,
  };

  return defineTool({
    name: "list_files",
    description:
      "List files and directories under a workspace-relative directory (recursive). Directories end with '/'. Skips node_modules, .git, dist, doc_build.",
    inputSchema: z.object({
      path: z.string().min(1).default(".").describe("workspace-relative directory path"),
    }),
    execute: async (input) => {
      const target = resolveInWorkspace(resolvedOptions.root, input.path);
      const out: string[] = [];
      walk(target, "", 0, resolvedOptions, out);
      if (out.length >= resolvedOptions.maxEntries) {
        out.push(`(truncated at ${resolvedOptions.maxEntries} entries)`);
      }
      return out.join("\n");
    },
  });
};
