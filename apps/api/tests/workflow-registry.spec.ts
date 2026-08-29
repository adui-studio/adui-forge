import { describe, expect, it } from "vite-plus/test";
import { WorkflowsRegistry } from "../src/workflows/workflow.registry";
import { registerWorkflowSchema } from "../src/workflows/workflows.registry.controller";

describe("WorkflowsRegistry", () => {
  it("registers, lists and rejects duplicates / unknown", () => {
    const registry = new WorkflowsRegistry();
    registry.register({ name: "pipeline", description: "d", tasks: ["a", "b"] });
    expect(registry.list()).toHaveLength(1);
    expect(registry.get("pipeline").tasks).toEqual(["a", "b"]);
    expect(() => registry.register({ name: "pipeline", description: "", tasks: ["x"] })).toThrow(
      "already registered",
    );
    expect(() => registry.get("nope")).toThrow('unknown workflow: "nope"');
  });

  it("register schema validates name and tasks", () => {
    expect(() => registerWorkflowSchema.parse({ name: "Bad Name", tasks: ["a"] })).toThrow();
    expect(() => registerWorkflowSchema.parse({ name: "ok", tasks: [] })).toThrow();
    expect(registerWorkflowSchema.parse({ name: "ok", tasks: ["a"] }).description).toBe("");
  });
});
