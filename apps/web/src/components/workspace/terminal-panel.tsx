import { useQuery } from "@tanstack/react-query";
import { SquareTerminal, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { FitAddon } from "@xterm/addon-fit";
import { Terminal } from "@xterm/xterm";
import "@xterm/xterm/css/xterm.css";
import { getPlatformAdapter } from "@/platform/adapter.ts";

/**
 * 工作区终端 Panel（ADR-004 阶段 4）：xterm.js 连接本地 Runner 的 shell WebSocket。
 * 仅桌面模式可用（云端 API 不提供终端）；管道模式——无全屏 TUI 支持。
 */
export function TerminalPanel({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const [connected, setConnected] = useState(false);

  const { data: runner } = useQuery({
    queryKey: ["runner-info"],
    queryFn: () => getPlatformAdapter().getRunnerInfo(),
    staleTime: 10_000,
  });
  const { data: runtime } = useQuery({
    queryKey: ["runner-runtime", runner?.baseUrl],
    queryFn: async (): Promise<"bun" | "node" | "unknown"> => {
      if (runner?.running !== true || runner.baseUrl === null) return "unknown";
      try {
        const response = await fetch(`${runner.baseUrl}/health`);
        const body = (await response.json()) as { runtime?: "bun" | "node" };
        return body.runtime ?? "unknown";
      } catch {
        return "unknown";
      }
    },
    staleTime: 60_000,
  });

  useEffect(() => {
    const info = runner;
    if (info?.running !== true || info.baseUrl === null || containerRef.current === null) {
      return;
    }
    const wsUrl = `${info.baseUrl.replace(/^http/, "ws")}/api/v1/terminal/ws?token=${encodeURIComponent(info.token ?? "")}`;
    const socket = new WebSocket(wsUrl);

    const terminal = new Terminal({
      fontSize: 12,
      theme: { background: "#0D0F13", foreground: "#E4E4E7", cursor: "#6CFF00" },
      convertEol: false,
    });
    const fitAddon = new FitAddon();
    terminal.loadAddon(fitAddon);
    terminal.open(containerRef.current);
    try {
      fitAddon.fit();
    } catch {
      // 容器尺寸为 0 时 fit 可能失败，忽略
    }

    socket.onopen = () => {
      setConnected(true);
      terminal.focus();
    };
    socket.onmessage = (event) => {
      terminal.write(String(event.data));
    };
    socket.onclose = () => {
      setConnected(false);
      terminal.write("\r\n\x1b[90m[连接已关闭]\x1b[0m\r\n");
    };
    terminal.onData((data) => {
      if (socket.readyState === WebSocket.OPEN) socket.send(data);
    });
    const onResize = (): void => {
      try {
        fitAddon.fit();
      } catch {
        // 忽略
      }
    };
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      socket.close();
      terminal.dispose();
    };
  }, [runner]);

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-lg border border-[#20242C] bg-[#0D0F13]">
      <div className="flex items-center gap-2 border-b border-[#20242C] px-3 py-1.5">
        <SquareTerminal className="h-3.5 w-3.5 text-brand-300" />
        <span className="text-xs text-slate-400">{t("workspace.terminalTitle")}</span>
        {runner?.running === true && (
          <span className="forge-code text-[10px] text-slate-600">{runner.baseUrl}</span>
        )}
        <button
          type="button"
          aria-label={t("workspace.closeTerminal")}
          className="ml-auto text-slate-500 hover:text-slate-200"
          onClick={onClose}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      {runtime === "bun" ? (
        <div className="flex min-h-0 flex-1 items-center justify-center px-4">
          <p className="text-center text-xs text-slate-500">{t("workspace.terminalBunLimited")}</p>
        </div>
      ) : (
        <div ref={containerRef} className="min-h-0 flex-1 px-2 py-1" />
      )}
      {!connected && (
        <p className="border-t border-[#20242C] px-3 py-1 text-[10px] text-slate-600">
          {t("workspace.terminalConnecting")}
        </p>
      )}
    </div>
  );
}
