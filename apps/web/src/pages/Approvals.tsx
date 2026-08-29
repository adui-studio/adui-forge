import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchPendingApprovals, submitApprovalDecision } from "../lib/approvals.ts";

export function ApprovalsPage() {
  const queryClient = useQueryClient();
  const {
    data: approvals,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["approvals"],
    queryFn: fetchPendingApprovals,
    refetchInterval: 2_000,
  });

  const decision = useMutation({
    mutationFn: (input: { id: string; decision: "approved" | "rejected" }) =>
      submitApprovalDecision(input.id, input.decision),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["approvals"] });
      void queryClient.invalidateQueries({ queryKey: ["runs"] });
    },
  });

  return (
    <main>
      <h1>待审批</h1>
      <p>
        <a href="/runs">← Run 列表</a>
      </p>
      {isLoading && <p>加载中…</p>}
      {isError && <p role="alert">{String(error)}</p>}
      {approvals !== undefined && approvals.length === 0 && <p>当前没有待审批操作。</p>}
      {approvals?.map((item) => (
        <div key={item.id}>
          <h2>
            {item.toolName} — Run {item.runId.slice(0, 16)}…
          </h2>
          <p>{item.reason}</p>
          <pre>{JSON.stringify(item.input, null, 2)}</pre>
          <button
            type="button"
            onClick={() => decision.mutate({ id: item.id, decision: "approved" })}
          >
            批准
          </button>{" "}
          <button
            type="button"
            onClick={() => decision.mutate({ id: item.id, decision: "rejected" })}
          >
            拒绝
          </button>
        </div>
      ))}
      {decision.isError && <p role="alert">{String(decision.error)}</p>}
    </main>
  );
}
