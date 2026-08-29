export { defineTool, type ToolDefinition } from "./define.ts";
export { ToolRegistry } from "./registry.ts";
export { resolveInWorkspace } from "./fs/boundary.ts";
export { createReadFileTool, type ReadFileToolOptions } from "./fs/read-file.ts";
export { createListFilesTool, type ListFilesToolOptions } from "./fs/list-files.ts";
export { createSearchFilesTool, type SearchFilesToolOptions } from "./fs/search-files.ts";

import { createListFilesTool } from "./fs/list-files.ts";
import { createReadFileTool } from "./fs/read-file.ts";
import { createSearchFilesTool } from "./fs/search-files.ts";

/** 创建内置只读文件工具组（read_file / list_files / search_files），全部限定在 root 内。 */
export const createFileTools = (options: { root: string }) => {
  return [
    createReadFileTool(options),
    createListFilesTool(options),
    createSearchFilesTool(options),
  ];
};
