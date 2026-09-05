import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ShieldAlert, X } from "lucide-react";
import { Link } from "react-router";
import { AppShell } from "@/components/app-shell.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
import { fetchPendingApprovals, submitApprovalDecision } from "@/lib/approvals.ts";

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
    <AppShell>
      <div className="mb-6 flex items-center gap-2">
        <ShieldAlert className="h-5 w-5 text-amber-500" />
        <h1 className="text-xl font-bold text-slate-100">待审批</h1>
      </div>

      {isLoading && <p className="text-sm text-slate-500">加载中…</p>}
      {isError && (
        <p role="alert" className="text-sm text-red-600">
          {String(error)}
        </p>
      )}
      {approvals !== undefined && approvals.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center text-sm text-slate-500">
            当前没有待审批操作。高风险操作（Shell / Git 写入）执行前会在这里请求批准。
          </CardContent>
        </Card>
      )}
      <div className="flex flex-col gap-3">
        {approvals?.map((item) => (
          <Card key={item.id}>
            <CardHeader>
              <CardTitle className="font-mono text-sm">{item.toolName}</CardTitle>
              <CardDescription>
                {item.reason} ·{" "}
                <Link to={`/runs/${item.runId}`} className="text-brand-500 hover:underline">
                  查看 Run
                </Link>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="overflow-auto rounded-lg bg-slate-900 p-3 font-mono text-xs text-slate-100">
                {JSON.stringify(item.input, null, 2)}
              </pre>
              <div className="mt-4 flex justify-end gap-2">
                <Button
                  variant="outline"
                  disabled={decision.isPending}
                  onClick={() => decision.mutate({ id: item.id, decision: "rejected" })}
                >
                  <X className="h-4 w-4" /> 拒绝
                </Button>
                <Button
                  disabled={decision.isPending}
                  onClick={() => decision.mutate({ id: item.id, decision: "approved" })}
                >
                  <Check className="h-4 w-4" /> 批准
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      {decision.isError && (
        <p role="alert" className="mt-3 text-sm text-red-600">
          {String(decision.error)}
        </p>
      )}
    </AppShell>
  );
}
