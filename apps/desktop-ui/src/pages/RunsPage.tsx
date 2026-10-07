import { Button, Card, Empty, Spin, Tag } from "antd";
import { Cloud, HardDrive } from "lucide-react";
import type { AppState } from "../App.tsx";

const statusColor = (status: string): string =>
  status === "completed"
    ? "text-[#6CFF00]"
    : status === "failed"
      ? "text-red-400"
      : status === "running" || status === "queued"
        ? "text-[#B79AEC]"
        : "text-slate-300";

const RunRow = ({
  id,
  status,
  task,
  agentName,
  onClick,
}: {
  id: string;
  status: string;
  task: string;
  agentName: string;
  onClick?: () => void;
}) => (
  <button
    type="button"
    className="flex w-full items-center gap-3 border-b border-[#232833] px-3 py-2 text-left last:border-b-0 hover:bg-[#2A2F3A]"
    onClick={onClick}
  >
    <span className={`w-20 shrink-0 font-mono text-xs ${statusColor(status)}`}>{status}</span>
    <span className="flex-1 truncate text-sm">{task}</span>
    <span className="shrink-0 font-mono text-xs text-slate-600">{agentName}</span>
    <span className="hidden shrink-0 font-mono text-[10px] text-slate-700">{id}</span>
  </button>
);

/** Runs：云端（登录后）与本地（Runner 运行中）两个数据源 + 本地详情面板。 */
export function RunsPage({ state }: { state: AppState }) {
  const runnerRunning = state.runner?.running === true;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-semibold">Runs</h1>
        <p className="mt-0.5 text-sm text-slate-500">
          云端 Runs（登录后）与本地 Runs（Runner 运行中）在此汇总。
        </p>
      </div>

      <Card
        title={
          <span className="flex items-center gap-2 text-sm">
            <Cloud size={14} className="text-slate-500" /> 云端 Runs
          </span>
        }
        extra={
          state.loggedIn ? (
            <Button
              size="small"
              loading={state.loadingCloudRuns}
              onClick={() => void state.loadCloudRuns()}
            >
              刷新
            </Button>
          ) : undefined
        }
      >
        {!state.loggedIn ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={<span className="text-slate-600">登录后可查看云端 Runs。</span>}
          />
        ) : state.cloudRunsError !== "" ? (
          <p className="text-sm text-red-400">{state.cloudRunsError}</p>
        ) : state.cloudRuns.length === 0 ? (
          <p className="text-sm text-slate-600">暂无记录——点「刷新」加载。</p>
        ) : (
          <div className="overflow-hidden rounded border border-[#2A2F3A]">
            {state.cloudRuns.slice(0, 20).map((run) => (
              <RunRow key={run.id} {...run} />
            ))}
          </div>
        )}
      </Card>

      <Card
        title={
          <span className="flex items-center gap-2 text-sm">
            <HardDrive size={14} className="text-slate-500" /> 本地 Runs
            <span className="text-xs font-normal text-slate-600">（SQLite 持久化，重启不丢）</span>
          </span>
        }
        extra={
          runnerRunning ? (
            <Button
              size="small"
              loading={state.loadingLocalRuns}
              onClick={() => void state.loadLocalRuns()}
            >
              刷新
            </Button>
          ) : undefined
        }
      >
        {!runnerRunning ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <span className="text-slate-600">
                Runner 未运行——在<a onClick={() => state.setPage("overview")}>概览</a>
                页启动。
              </span>
            }
          />
        ) : state.localRunsError !== "" ? (
          <p className="text-sm text-red-400">{state.localRunsError}</p>
        ) : state.localRuns.length === 0 ? (
          <p className="text-sm text-slate-600">暂无本地运行记录。</p>
        ) : (
          <>
            <div className="overflow-hidden rounded border border-[#2A2F3A]">
              {state.localRuns.slice(0, 15).map((run) => (
                <RunRow key={run.id} {...run} onClick={() => void state.openRunDetail(run.id)} />
              ))}
            </div>

            {state.selectedRunId !== null && (
              <div className="mt-3 rounded border border-[#343B48] bg-[#171A21] p-3">
                {state.loadingDetail ? (
                  <div className="flex justify-center py-4">
                    <Spin />
                  </div>
                ) : state.runDetailError !== "" ? (
                  <p className="text-sm text-red-400">{state.runDetailError}</p>
                ) : state.selectedRun !== null ? (
                  <>
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <Tag color={state.selectedRun.status === "completed" ? "green" : undefined}>
                        {state.selectedRun.status}
                      </Tag>
                      <span className="text-sm">{state.selectedRun.task}</span>
                      {(state.selectedRun.status === "running" ||
                        state.selectedRun.status === "queued") && (
                        <Button
                          danger
                          size="small"
                          className="ml-auto"
                          loading={state.cancellingRun}
                          onClick={() => void state.cancelRun(state.selectedRun!.id)}
                        >
                          取消
                        </Button>
                      )}
                    </div>
                    {state.selectedRun.error !== undefined && state.selectedRun.error !== "" && (
                      <p className="mb-2 font-mono text-xs text-red-400">
                        {state.selectedRun.error}
                      </p>
                    )}
                    <div className="max-h-56 overflow-y-auto rounded border border-[#2A2F3A] bg-[#171A21] p-2">
                      {state.selectedRun.events.length === 0 ? (
                        <p className="text-xs text-slate-600">（无事件）</p>
                      ) : (
                        state.selectedRun.events.map((event, index) => (
                          <div key={index} className="font-mono text-xs">
                            <span className="text-slate-600">{event.stepId ?? "—"}</span>{" "}
                            <span
                              className={
                                event.name.startsWith("run.") ? "text-[#6CFF00]" : "text-slate-300"
                              }
                            >
                              {event.name}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </>
                ) : null}
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
