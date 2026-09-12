import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ShieldAlert } from "lucide-react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { Button, Card, Listy, Spin } from "antd";
import { fetchPendingApprovals, submitApprovalDecision } from "@/lib/approvals.ts";

export function ApprovalsPage() {
  const { t } = useTranslation();
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
    <>
      <div className="mb-6 flex items-center gap-2">
        <ShieldAlert className="h-5 w-5 text-amber-400" />
        <h1 className="text-xl font-semibold text-slate-100">{t("approvals.title")}</h1>
      </div>

      {isLoading && (
        <div className="flex justify-center py-12">
          <Spin />
        </div>
      )}
      {isError && (
        <p role="alert" className="text-sm text-red-600">
          {String(error)}
        </p>
      )}
      {approvals !== undefined && approvals.length === 0 && (
        <Card>
          <div className="p-8 text-center text-sm text-slate-500">{t("approvals.empty")}</div>
        </Card>
      )}

      <Listy
        items={approvals ?? []}
        rowKey={(item) => item.id}
        itemRender={(item) => (
          <div className="rounded-lg border border-[#20242C] bg-[#111318] p-4">
            <div className="w-full">
              <div className="flex items-center gap-2">
                <span className="forge-code text-sm font-semibold text-amber-300">
                  ⚠ {item.toolName}
                </span>
                <Link
                  to={`/runs/${item.runId}`}
                  className="ml-auto text-xs text-[#B79AEC] hover:underline"
                >
                  {t("approvals.viewRun")}
                </Link>
              </div>
              <p className="mt-1 text-sm text-slate-400">{item.reason}</p>
              {/* §87 Approval Card：展示 What / Impact */}
              <pre className="forge-code mt-2 max-h-48 overflow-auto rounded-md border border-[#20242C] bg-[#0D0F13] p-3 text-slate-200">
                {JSON.stringify(item.input, null, 2)}
              </pre>
              <div className="mt-3 flex justify-end gap-2">
                {/* §88 拒绝用 Error 色；批准不获得默认焦点 */}
                <Button
                  danger
                  variant="outlined"
                  size="small"
                  disabled={decision.isPending}
                  onClick={() => decision.mutate({ id: item.id, decision: "rejected" })}
                >
                  {t("approvals.reject")}
                </Button>
                <Button
                  color="primary"
                  variant="solid"
                  size="small"
                  disabled={decision.isPending}
                  onClick={() => decision.mutate({ id: item.id, decision: "approved" })}
                >
                  {t("approvals.approve")}
                </Button>
              </div>
            </div>
          </div>
        )}
      />
      {decision.isError && (
        <p role="alert" className="mt-3 text-sm text-red-600">
          {String(decision.error)}
        </p>
      )}
    </>
  );
}
