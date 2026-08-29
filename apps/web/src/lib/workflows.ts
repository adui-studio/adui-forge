export interface WorkflowDefinitionRecord {
  name: string;
  description: string;
  tasks: string[];
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
