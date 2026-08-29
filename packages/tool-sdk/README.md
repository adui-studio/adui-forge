# @adui-forge/tool-sdk

Agent Tool 定义与内置工具集。

## 内容

- `defineTool` — 类型安全的 Tool 定义器（协议见 `@adui-forge/contracts`）
- `ToolRegistry` — 按名称注册与查找，重名拒绝
- `resolveInWorkspace` — Workspace 边界解析：防御 `../` 路径遍历与 symlink/junction 逃逸（AGENTS.md §40）
- `createFileTools({ root })` — 内置只读文件工具：
  - `read_file` — 读文本文件（单文件上限 2 MiB）
  - `list_files` — 递归列目录（跳过 node_modules / .git / dist / doc_build）
  - `search_files` — 大小写不敏感的子串搜索（不使用正则，避免 Agent 输入触发 ReDoS）

## 约定

- 写操作 / Shell / 外部系统 Tool 必须显式声明 `permission`，并进入 Sandbox（后续增量）。
- 所有文件访问必须经过 `resolveInWorkspace`，禁止直接使用 `fs` 处理 Tool 输入路径。
