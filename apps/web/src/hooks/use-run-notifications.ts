import { useEffect, useRef } from "react";
import type { RunRecord } from "@/lib/api.ts";
import { getPlatformAdapter } from "@/platform/adapter.ts";
import i18next from "i18next";

/**
 * Run 状态系统通知（DesignGuidelines §155）：
 * 仅当窗口不在前台(document.hidden)时提醒,避免前台打扰。
 * 通知:Run 完成 / 失败 / 出现待审批。
 */
export function useRunNotifications(runs: RunRecord[] | undefined): void {
  const previous = useRef<Map<string, string>>(new Map());
  const notifiedApprovals = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (runs === undefined || document.visibilityState === "visible") {
      // 前台时仍记录基线,切到后台后才能对比出变化
      if (runs !== undefined) {
        for (const run of runs) previous.current.set(run.id, run.status);
      }
      return;
    }

    for (const run of runs) {
      const before = previous.current.get(run.id);
      previous.current.set(run.id, run.status);

      if (before === undefined || before === run.status) continue;

      const adapter = getPlatformAdapter();
      if (run.status === "completed") {
        void adapter.notify({
          title: i18next.t("notifications.runCompleted"),
          body: run.task,
        });
      } else if (run.status === "failed") {
        void adapter.notify({
          title: i18next.t("notifications.runFailed"),
          body: `${run.task}${run.error !== undefined ? ` — ${run.error}` : ""}`,
        });
      } else if (run.status === "waiting_approval" && !notifiedApprovals.current.has(run.id)) {
        notifiedApprovals.current.add(run.id);
        void adapter.notify({
          title: i18next.t("notifications.waitingApproval"),
          body: run.task,
        });
      }
    }
  }, [runs]);
}
