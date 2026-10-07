import { Alert, Button, Card, Input, Tag } from "antd";
import { Box, KeyRound, Server } from "lucide-react";
import type { AppState } from "../App.tsx";

/** 概览：服务器连接 + 登录 + Local Runner——未登录时的主工作面。 */
export function OverviewPage({ state }: { state: AppState }) {
  const runnerRunning = state.runner?.running === true;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-semibold">概览</h1>
        <p className="mt-0.5 text-sm text-slate-500">
          连接云端服务器同步数据，或在本机启动 Runner 执行任务。
        </p>
      </div>

      <Card
        title={
          <span className="flex items-center gap-2 text-sm">
            <Server size={14} className="text-slate-500" /> 服务器
          </span>
        }
        extra={
          state.health !== null ? (
            <Tag color="green">在线 · DB {state.health.db}</Tag>
          ) : state.healthError !== "" ? (
            <Tag color="red">离线</Tag>
          ) : (
            <Tag>未检测</Tag>
          )
        }
      >
        <div className="flex flex-wrap items-center gap-2">
          <Input
            className="min-w-72 flex-1"
            placeholder="http://your-server:3000"
            value={state.serverInput}
            onChange={(event) => state.setServerInput(event.target.value)}
          />
          <Button
            loading={state.checkingHealth}
            disabled={state.serverInput.trim() === ""}
            onClick={() => void state.checkHealth()}
          >
            检测连接
          </Button>
        </div>
        {state.healthError !== "" && (
          <Alert className="mt-3" type="error" showIcon message={state.healthError} />
        )}

        {!state.loggedIn && (
          <div className="mt-4 border-t border-[#232833] pt-4">
            <p className="mb-2 flex items-center gap-1.5 text-xs text-slate-500">
              <KeyRound size={12} /> 登录以同步会话 / Skills / 任务 / 对比（与 Web 端同一账号）
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <Input
                className="w-44"
                placeholder="用户名"
                value={state.username}
                onChange={(event) => state.setUsername(event.target.value)}
              />
              <Input.Password
                className="w-44"
                placeholder="密码"
                value={state.password}
                onChange={(event) => state.setPassword(event.target.value)}
                onPressEnter={() => void state.doLogin()}
              />
              <Button
                type="primary"
                loading={state.loggingIn}
                disabled={state.username.trim() === "" || state.password === ""}
                onClick={() => void state.doLogin()}
              >
                登录
              </Button>
            </div>
            {state.authError !== "" && (
              <Alert className="mt-3" type="error" showIcon message={state.authError} />
            )}
          </div>
        )}
      </Card>

      <Card
        title={
          <span className="flex items-center gap-2 text-sm">
            <Box size={14} className="text-slate-500" /> Local Runner
            {!state.desktop && (
              <span className="text-xs font-normal text-slate-600">（仅桌面安装包内可用）</span>
            )}
          </span>
        }
        extra={
          runnerRunning ? (
            <Tag color="green">运行中 · {state.runner?.baseUrl}</Tag>
          ) : (
            <Tag>未运行</Tag>
          )
        }
      >
        {state.desktop ? (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <Input
                className="min-w-72 flex-1"
                placeholder="工作区根目录，例如 D:\Workspace\project"
                value={state.workspaceRoot}
                onChange={(event) => state.setWorkspaceRoot(event.target.value)}
              />
              <label className="flex items-center gap-1.5 text-xs text-slate-400">
                <input
                  type="checkbox"
                  checked={state.trustedMode}
                  onChange={(event) => state.setTrustedMode(event.target.checked)}
                />
                Trusted Local Mode
              </label>
              {runnerRunning ? (
                <Button danger loading={state.runnerBusy} onClick={() => void state.stopRunner()}>
                  停止
                </Button>
              ) : (
                <Button
                  type="primary"
                  loading={state.runnerBusy}
                  disabled={state.workspaceRoot.trim() === ""}
                  onClick={() => void state.startRunner()}
                >
                  启动
                </Button>
              )}
            </div>
            <p className="mt-2 text-xs text-slate-600">
              本地 Run 历史经 SQLite 持久化，Runner 重启后保留（ADR-010）。
              {runnerRunning && (
                <span>
                  {" "}
                  前往 <a onClick={() => state.setPage("runs")}>Runs</a> 查看；开启 Trusted Local
                  Mode 后可在 <a onClick={() => state.setPage("approvals")}>审批</a>{" "}
                  页处理本地高风险操作。
                </span>
              )}
            </p>
          </>
        ) : (
          <p className="text-sm text-slate-600">
            当前运行在浏览器（dev 服务）中，Runner 进程管理仅在桌面安装包内可用。
          </p>
        )}
      </Card>
    </div>
  );
}
