import { z } from "zod";

/** Step 类型，见 REQUIREMENTS.md §51。 */
export const STEP_TYPES = [
  "reasoning",
  "model",
  "tool",
  "mcp",
  "skill",
  "command",
  "approval",
  "human_input",
  "checkpoint",
  "artifact",
] as const;

export type StepType = (typeof STEP_TYPES)[number];

export const stepTypeSchema = z.enum(STEP_TYPES);
