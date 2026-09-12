import type { WorkflowGraph } from "@adui-forge/workflow";

export interface WorkflowDefinitionRecord {
  name: string;
  description: string;
  /** graph 定义时为拓扑序 agent 任务文本（兼容展示）。 */
  tasks: string[];
  graph?: WorkflowGraph;
}

export const fetchWorkflows = async (): Promise<WorkflowDefinitionRecord[]> => {
  const response = await fetch("/api/v1/workflows");
  if (!response.ok) throw new Error(`request failed: ${response.status}`);
  return (await response.json()) as WorkflowDefinitionRecord[];
};

export const runWorkflow = async (name: string): Promise<{ id: string }> => {
  const response = await fetch(`/api/v1/workflows/${name}/runs`, {
    method: "POST",
    headers: { "content-type": "application/json" },
  });
  if (!response.ok) throw new Error(`request failed: ${response.status}`);
  return (await response.json()) as { id: string };
};
