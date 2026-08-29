import type { AgentTool } from "@adui-forge/contracts";

/** 按名称管理 Tool 注册与查找；重名注册视为编程错误。 */
export class ToolRegistry {
  readonly #tools = new Map<string, AgentTool>();

  register(tool: AgentTool): void {
    if (this.#tools.has(tool.name)) {
      throw new Error(`tool already registered: "${tool.name}"`);
    }
    this.#tools.set(tool.name, tool);
  }

  registerAll(tools: AgentTool[]): void {
    for (const tool of tools) {
      this.register(tool);
    }
  }

  get(name: string): AgentTool | undefined {
    return this.#tools.get(name);
  }

  list(): AgentTool[] {
    return [...this.#tools.values()];
  }
}
