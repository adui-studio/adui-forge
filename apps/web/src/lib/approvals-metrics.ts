import { authHeader } from "./auth.ts";
import type { ArtifactRecord } from "./api-metrics.ts";

export const fetchPendingApprovals = async (): Promise<
  Array<{ id: string; runId: string; toolName: string; reason: string; input: unknown }>
> => {
  const response = await fetch("/api/v1/approvals/pending", { headers: authHeader() });
  if (!response.ok) throw new Error(`request failed: ${response.status}`);
  return (await response.json()) as Array<{
    id: string;
    runId: string;
    toolName: string;
    reason: string;
    input: unknown;
  }>;
};

export const fetchHealth = async (): Promise<{ status: string; db: string }> => {
  const response = await fetch("/api/v1/health");
  if (!response.ok) throw new Error(`request failed: ${response.status}`);
  return (await response.json()) as { status: string; db: string };
};

export const fetchMetrics = async (): Promise<{
  runs: { total: number; byStatus: Record<string, number> };
  approvals: { pending: number };
}> => {
  const response = await fetch("/api/v1/metrics", { headers: authHeader() });
  if (!response.ok) throw new Error(`request failed: ${response.status}`);
  return (await response.json()) as {
    runs: { total: number; byStatus: Record<string, number> };
    approvals: { pending: number };
  };
};

export const fetchArtifacts = async (runId: string): Promise<ArtifactRecord[]> => {
  const response = await fetch(`/api/v1/runs/${runId}/artifacts`, { headers: authHeader() });
  if (!response.ok) throw new Error(`request failed: ${response.status}`);
  return (await response.json()) as ArtifactRecord[];
};
