export interface Metrics {
  runs: { total: number; byStatus: Record<string, number> };
  approvals: { pending: number };
  memory: { records: number };
}

export const fetchMetrics = async (): Promise<Metrics> => {
  const response = await fetch("/api/v1/metrics");
  if (!response.ok) throw new Error(`request failed: ${response.status}`);
  return (await response.json()) as Metrics;
};

export const fetchHealth = async (): Promise<{ status: string; db: string }> => {
  const response = await fetch("/api/v1/health");
  if (!response.ok) throw new Error(`request failed: ${response.status}`);
  return (await response.json()) as { status: string; db: string };
};

export interface ArtifactRecord {
  id: string;
  runId: string;
  name: string;
  type: string;
  content: string;
  createdAt: string;
}

export const fetchArtifacts = async (runId: string): Promise<ArtifactRecord[]> => {
  const response = await fetch(`/api/v1/runs/${runId}/artifacts`);
  if (!response.ok) throw new Error(`request failed: ${response.status}`);
  return (await response.json()) as ArtifactRecord[];
};
