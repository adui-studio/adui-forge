import { Alert, Button, Card, Empty } from "antd";
import { ListChecks } from "lucide-react";
import type { AppState } from "../App.tsx";

/** 审批：本地高风险操作（Trusted Local Mode）的批准 / 拒绝。 */
export function ApprovalsPage({ state }: { state: AppState }) {
  const runnerRunning = state.runner?.running === true;
  const trusted = runnerRunning && state.runner?.trusted === true;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-semibold">审批</h1>
        <p className="mt-0.5 text-sm text-slate-500">
          Shell / Git 等高风险操作执行前在此等待人工决策；每次决策都会留痕审计。
        </p>
      </div>

      {!runnerRunning ? (
        <Card>
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <span className="text-slate-600">
                Runner 未运行——在<a onClick={() => state.setPage("overview")}>概览</a>页启动。
              </span>
            }
          />
        </Card>
      ) : !trusted ? (
        <Alert
          type="info"
          showIcon
          message="Trusted Local Mode 未开启"
          description="在概览页勾选 Trusted Local Mode 并重启 Runner 后，本地高风险操作会在这里请求批准。"
        />
      ) : (
        <Card
          title={
            <span className="flex items-center gap-2 text-sm">
              <ListChecks size={14} className="text-amber-400" /> 待审批
            </span>
          }
          extra={
            <Button
              size="small"
              loading={state.loadingApprovals}
              onClick={() => void state.loadApprovals()}
            >
              刷新
            </Button>
          }
        >
          {state.pendingApprovals.length === 0 ? (
            <p className="text-sm text-slate-600">当前没有待审批操作。</p>
          ) : (
            <div className="flex flex-col gap-3">
              {state.pendingApprovals.map((item) => (
                <div key={item.id} className="rounded border border-[#4A3A5C] bg-[#241B2E] p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-sm font-semibold text-amber-300">
                      ⚠ {item.toolName}
                    </span>
                    <span className="ml-auto font-mono text-xs text-slate-600">{item.runId}</span>
                  </div>
                  <p className="mt-1 text-sm text-slate-400">{item.reason}</p>
                  <pre className="mt-2 max-h-32 overflow-auto rounded border border-[#20242C] bg-[#0D0F13] p-2 font-mono text-xs text-slate-300">
                    {JSON.stringify(item.input, null, 2)}
                  </pre>
                  <div className="mt-2 flex justify-end gap-2">
                    <Button
                      danger
                      size="small"
                      disabled={state.actingApprovalId !== null}
                      onClick={() => void state.decide(item.id, "rejected")}
                    >
                      拒绝
                    </Button>
                    <Button
                      type="primary"
                      size="small"
                      disabled={state.actingApprovalId !== null}
                      onClick={() => void state.decide(item.id, "approved")}
                    >
                      批准
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
