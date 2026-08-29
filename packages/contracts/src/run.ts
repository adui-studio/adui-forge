import { z } from "zod";

/** Run 生命周期状态，见 REQUIREMENTS.md §50。 */
export const RUN_STATUSES = [
  "queued",
  "preparing",
  "running",
  "waiting_approval",
  "waiting_input",
  "paused",
  "completed",
  "failed",
  "cancelled",
  "timeout",
] as const;

export type RunStatus = (typeof RUN_STATUSES)[number];

export const runStatusSchema = z.enum(RUN_STATUSES);
