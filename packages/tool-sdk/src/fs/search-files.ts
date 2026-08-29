import { statSync } from "node:fs";
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { z } from "zod";
import { defineTool } from "../define.ts";
import { resolveInWorkspace } from "./boundary.ts";

export interface SearchFilesToolOptions {
  root: string;
  /** 返回匹配行上限，默认 50。 */
  maxMatches?: number;
  /** 单文件扫描上限（字节），默认 1 MiB。 */
  maxFileBytes?: number;
}

const SKIPPED_DIRECTORIES = new Set(["node_modules", ".git", "dist", "doc_build"]);
const MAX_DEPTH = 8;

const looksLikeBinary = (content: string): boolean => content.includes("\0");

export const createSearchFilesTool = (options: SearchFilesToolOptions) => {
  const maxMatches = options.maxMatches ?? 50;
  const maxFileBytes = options.maxFileBytes ?? 1024 * 1024;

  const walk = async (
    absoluteDir: string,
    relativeDir: string,
    depth: number,
    pattern: RegExp,
    out: string[],
  ): Promise<void> => {
    if (out.length >= maxMatches || depth > MAX_DEPTH) {
      return;
    }
    const entries = await readdir(absoluteDir, { withFileTypes: true });
    for (const entry of entries) {
      if (out.length >= maxMatches) {
        return;
      }
      const relativePath = relativeDir === "" ? entry.name : `${relativeDir}/${entry.name}`;
      if (entry.isDirectory()) {
        if (SKIPPED_DIRECTORIES.has(entry.name)) {
          continue;
        }
        await walk(join(absoluteDir, entry.name), relativePath, depth + 1, pattern, out);
        continue;
      }
      if (!entry.isFile()) {
        continue;
      }
      const absoluteFile = join(absoluteDir, entry.name);
      const stat = statSync(absoluteFile);
      if (stat.size > maxFileBytes) {
        continue;
      }
      const content = await readFile(absoluteFile, "utf8");
      if (looksLikeBinary(content)) {
        continue;
      }
      const lines = content.split(/\r?\n/);
      for (let index = 0; index < lines.length; index += 1) {
        if (pattern.test(lines[index])) {
          out.push(`${relativePath}:${index + 1}: ${lines[index].trim()}`);
          if (out.length >= maxMatches) {
            return;
          }
        }
      }
    }
  };

  return defineTool({
    name: "search_files",
    description:
      "Search a case-insensitive substring inside workspace text files. Returns 'path:line: line' matches. Skips node_modules, .git, dist, doc_build and large/binary files.",
    inputSchema: z.object({
      query: z.string().min(1).describe("case-insensitive substring to search"),
      path: z.string().min(1).default(".").describe("workspace-relative directory to search in"),
    }),
    execute: async (input) => {
      // 子串搜索而非正则：Agent 输入直接进入 RegExp 有 ReDoS / 注入风险
      const pattern = new RegExp(input.query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      const target = resolveInWorkspace(options.root, input.path);
      const out: string[] = [];
      await walk(target, "", 0, pattern, out);
      if (out.length === 0) {
        return `no matches for "${input.query}"`;
      }
      if (out.length >= maxMatches) {
        out.push(`(truncated at ${maxMatches} matches)`);
      }
      return out.join("\n");
    },
  });
};
