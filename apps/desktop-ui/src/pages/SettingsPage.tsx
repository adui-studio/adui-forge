import { Button, Card, Input, Tag, Typography } from "antd";
import { Server } from "lucide-react";
import type { AppState } from "../App.tsx";

/** 设置：服务器连接与检测、应用信息。 */
export function SettingsPage({ state }: { state: AppState }) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-semibold">设置</h1>
        <p className="mt-0.5 text-sm text-slate-500">服务器地址保存在本机，登录后与云端同步。</p>
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
            type="primary"
            ghost
            loading={state.checkingHealth}
            disabled={state.serverInput.trim() === ""}
            onClick={() => void state.checkHealth()}
          >
            检测连接
          </Button>
        </div>
        <p className="mt-2 text-xs text-slate-600">
          登录与云数据（会话 / Skills / 任务 / 对比 / 云 Runs）都走该地址；本地 Runner
          与此无关（始终 127.0.0.1）。
        </p>
      </Card>

      <Card title="关于">
        <div className="flex flex-col gap-1 text-sm text-slate-400">
          <p>
            ADui Forge Desktop · v{typeof __APP_VERSION__ === "string" ? __APP_VERSION__ : "dev"}
          </p>
          <p className="text-xs text-slate-600">
            独立桌面前端（React + antd，ADR-011）；领域逻辑与 Web / Mobile 共享同一云端 API 与
            Runner 契约。
          </p>
          <Typography.Link className="text-xs" onClick={() => state.setPage("overview")}>
            返回概览
          </Typography.Link>
        </div>
      </Card>
    </div>
  );
}
