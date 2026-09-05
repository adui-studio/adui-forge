import { Tag } from "antd";
import { statusLabel } from "@/lib/status.ts";

/**
 * 统一 Run 状态标签（DesignGuidelines §157/§164）：
 * 颜色 + 符号 + 文本三重编码；Lime 仅表示 Agent 执行中（§16 Lime ≠ Success）。
 */
const MAP: Record<string, { color: string; symbol: string }> = {
  queued: { color: "default", symbol: "○" },
  preparing: { color: "default", symbol: "○" },
  running: { color: "#6CFF00", symbol: "●" },
  waiting_approval: { color: "warning", symbol: "⚠" },
  waiting_input: { color: "warning", symbol: "⚠" },
  paused: { color: "default", symbol: "‖" },
  completed: { color: "success", symbol: "✓" },
  failed: { color: "error", symbol: "✕" },
  cancelled: { color: "default", symbol: "⊘" },
  timeout: { color: "error", symbol: "⏱" },
};

export function StatusTag({ status }: { status: string }) {
  const spec = MAP[status] ?? { color: "default", symbol: "○" };
  const lime = spec.color === "#6CFF00";
  return (
    <Tag
      color={lime ? undefined : spec.color}
      style={
        lime
          ? {
              color: "#6CFF00",
              borderColor: "rgba(108,255,0,0.4)",
              background: "rgba(108,255,0,0.08)",
            }
          : undefined
      }
    >
      <span aria-hidden className="mr-1">
        {spec.symbol}
      </span>
      {statusLabel(status)}
    </Tag>
  );
}
