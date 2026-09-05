import { describe, expect, it } from "vite-plus/test";
import { WorkflowsRegistry } from "../src/workflows/workflow.registry";
import { registerWorkflowSchema } from "../src/workflows/workflows.registry.controller";

describe("WorkflowsRegistry", () => {
  it("registers, lists and overwrites existing definitions (upsert)", () => {
    const registry = new WorkflowsRegistry();
    registry.register({ name: "pipeline", description: "d", tasks: ["a", "b"] });
    expect(registry.list()).toHaveLength(1);
    expect(registry.get("pipeline").tasks).toEqual(["a", "b"]);
    // 编辑器保存已有定义 = 覆盖
    registry.register({ name: "pipeline", description: "d2", tasks: ["c"] });
    expect(registry.get("pipeline").tasks).toEqual(["c"]);
    expect(() => registry.get("nope")).toThrow('unknown workflow: "nope"');
  });

  it("register schema validates name and tasks", () => {
    expect(() => registerWorkflowSchema.parse({ name: "Bad Name", tasks: ["a"] })).toThrow();
    expect(() => registerWorkflowSchema.parse({ name: "ok", tasks: [] })).toThrow();
    expect(registerWorkflowSchema.parse({ name: "ok", tasks: ["a"] }).description).toBe("");
  });
});
