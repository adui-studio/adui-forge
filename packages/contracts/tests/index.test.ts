import { describe, expect, it } from "vite-plus/test";
import {
  AGENT_EVENT_NAMES,
  agentEventNameSchema,
  createAgentEvent,
  runStatusSchema,
  stepTypeSchema,
} from "../src/index.ts";

describe("runStatusSchema", () => {
  it("accepts a known status", () => {
    expect(runStatusSchema.parse("waiting_approval")).toBe("waiting_approval");
  });

  it("rejects an unknown status", () => {
    expect(() => runStatusSchema.parse("done")).toThrow();
  });
});

describe("stepTypeSchema", () => {
  it("accepts a known step type", () => {
    expect(stepTypeSchema.parse("tool")).toBe("tool");
  });
});

describe("agent events", () => {
  it("event names follow domain.action convention", () => {
    for (const name of AGENT_EVENT_NAMES) {
      expect(name).toMatch(/^[a-z]+\.[a-z_]+$/);
    }
  });

  it("createAgentEvent fills timestamp", () => {
    const event = createAgentEvent("run.started", "run_1", { foo: 1 });
    expect(event.name).toBe("run.started");
    expect(event.runId).toBe("run_1");
    expect(event.payload).toEqual({ foo: 1 });
    expect(new Date(event.timestamp).getTime()).not.toBeNaN();
  });

  it("validates an event envelope", () => {
    const event = createAgentEvent("tool.failed", "run_1", { error: "x" }, "step_1");
    expect(agentEventNameSchema.parse(event.name)).toBe("tool.failed");
  });
});
