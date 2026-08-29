import { statSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { z } from "zod";
import { defineTool } from "../define.ts";
import { resolveInWorkspace } from "./boundary.ts";

export interface ReadFileToolOptions {
  root: string;
  /** 单文件读取上限（字节），默认 2 MiB。 */
  maxBytes?: number;
}

export const createReadFileTool = (options: ReadFileToolOptions) => {
  const maxBytes = options.maxBytes ?? 2 * 1024 * 1024;

  return defineTool({
    name: "read_file",
    description:
      "Read a UTF-8 text file inside the workspace. Path is workspace-relative. Fails on missing files and files above the size limit.",
    inputSchema: z.object({
      path: z.string().min(1).describe("workspace-relative file path"),
    }),
    execute: async (input) => {
      const target = resolveInWorkspace(options.root, input.path);
      const stat = statSync(target);
      if (!stat.isFile()) {
        throw new Error(`not a file: ${input.path}`);
      }
      if (stat.size > maxBytes) {
        throw new Error(`file too large (${stat.size} bytes, limit ${maxBytes}): ${input.path}`);
      }
      return readFile(target, "utf8");
    },
  });
};
