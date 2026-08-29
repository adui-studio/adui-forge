import type { AgentTool, ToolContext, ToolPermission } from "@adui-forge/contracts";
import type { ZodType } from "zod";

export interface ToolDefinition<TInput> {
  name: string;
  description: string;
  /** 默认 free；涉及写操作 / 外部系统的 Tool 必须显式声明权限（AGENTS.md §37）。 */
  permission?: ToolPermission;
  inputSchema: ZodType<TInput>;
  execute(input: TInput, context: ToolContext): Promise<unknown>;
}

/** 类型安全的 Tool 定义器：从 spec 推导输入类型并补全默认值。 */
export const defineTool = <TInput>(spec: ToolDefinition<TInput>): AgentTool<TInput> => {
  return {
    name: spec.name,
    description: spec.description,
    permission: spec.permission ?? "free",
    inputSchema: spec.inputSchema,
    execute: spec.execute,
  };
};
