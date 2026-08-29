import type { AgentTool } from "@adui-forge/contracts";
import { z } from "zod";
import type { Agent } from "./define.ts";

export interface AgentAsToolOptions {
  agent: Agent;
  /** 工具名，默认 `delegate_<agentName>`。 */
  name?: string;
  description?: string;
}

/**
 * Multi-Agent 委派（REQUIREMENTS.md §41 Agent as Tool）：
 * 把一个 Agent 包装为可被上层 Agent 调用的工具。
 *
 * - 子 Agent 的 Run / Step / Trace 完全独立（自带 runId），不会混入父级日志流
 * - permission 为 free：委派本身不危险；子 Agent 内部的 approval 级工具
 *   仍会在其自身执行链路上触发审批
 * - 递归委派的深度由各 Agent 的 maxSteps 约束
 */
export const agentToTool = (options: AgentAsToolOptions): AgentTool<{ task: string }> => {
  const { agent } = options;
  return {
    name: options.name ?? `delegate_${agent.name}`,
    description:
      options.description ??
      `Delegate the task to the "${agent.name}" agent (${agent.description}) and return its final answer.`,
    permission: "free",
    inputSchema: z.object({ task: z.string().min(1) }),
    execute: async (input) => {
      const result = await agent.run(input.task);
      if (result.status !== "completed") {
        throw new Error(
          `delegated agent "${agent.name}" ended with status ${result.status}${result.error !== undefined ? `: ${result.error}` : ""}`,
        );
      }
      return (
        result.messages.filter((message) => message.role === "assistant").at(-1)?.content ?? ""
      );
    },
  };
};
