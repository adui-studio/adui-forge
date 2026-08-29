import { authHeader } from "./auth.ts";

export interface PendingApproval {
  id: string;
  runId: string;
  toolName: string;
  input: unknown;
  reason: string;
  createdAt: string;
}

export const fetchPendingApprovals = async (): Promise<PendingApproval[]> => {
  const response = await fetch("/api/v1/approvals/pending", { headers: authHeader() });
  if (!response.ok) {
    throw new Error(`request failed: ${response.status}`);
  }
  return (await response.json()) as PendingApproval[];
};

export const submitApprovalDecision = async (
  id: string,
  decision: "approved" | "rejected",
): Promise<void> => {
  const response = await fetch(`/api/v1/approvals/${id}/decision`, {
    method: "POST",
    headers: { "content-type": "application/json", ...authHeader() },
    body: JSON.stringify({ decision }),
  });
  if (!response.ok) {
    throw new Error(`request failed: ${response.status}`);
  }
};
