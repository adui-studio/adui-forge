import { describe, expect, it } from "vite-plus/test";
import type { WorkflowGraph } from "@adui-forge/workflow";
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

  it("存储形态 round-trip：线性定义不含 graph 字段", () => {
    const registry = new WorkflowsRegistry();
    registry.register({ name: "linear", description: "d", tasks: ["a"] });
    const record = registry.get("linear");
    expect(record.graph).toBeUndefined();
    expect(record).toEqual({ name: "linear", description: "d", tasks: ["a"] });
  });

  it("register schema validates name and tasks", () => {
    expect(() => registerWorkflowSchema.parse({ name: "Bad Name", tasks: ["a"] })).toThrow();
    expect(() => registerWorkflowSchema.parse({ name: "ok", tasks: [] })).toThrow();
    expect(registerWorkflowSchema.parse({ name: "ok", tasks: ["a"] }).description).toBe("");
  });

  it("graph 定义注册后 get 返回 graph 与派生 tasks，list 亦然", () => {
    const registry = new WorkflowsRegistry();
    const graph: WorkflowGraph = {
      nodes: [
        { id: "n1", type: "agent", task: "run" },
        { id: "c", type: "condition", when: { node: "n1", op: "not_empty" } },
        { id: "n2", type: "agent", task: "report" },
      ],
      edges: [
        { source: "n1", target: "c" },
        { source: "c", target: "n2", branch: "then" },
      ],
    };
    registry.register({ name: "branchy", description: "g", tasks: [], graph });
    const record = registry.get("branchy");
    expect(record.graph).toEqual(graph);
    expect(record.tasks).toEqual(["run", "report"]);
    expect(registry.list()[0]?.graph).toEqual(graph);
  });

  it("register schema：graph 与 tasks 二选一，graph 不合法时拒绝注册", () => {
    expect(() =>
      registerWorkflowSchema.parse({ name: "ok", tasks: ["a"], graph: undefined }),
    ).not.toThrow();
    expect(() =>
      registerWorkflowSchema.parse({
        name: "ok",
        tasks: ["a"],
        graph: {
          nodes: [{ id: "n", type: "agent", task: "x" }],
          edges: [],
        },
      }),
    ).toThrow("二选一");
    // 环被拒绝
    expect(() =>
      registerWorkflowSchema.parse({
        name: "ok",
        graph: {
          nodes: [
            { id: "a", type: "agent", task: "x" },
            { id: "b", type: "agent", task: "y" },
          ],
          edges: [
            { source: "a", target: "b" },
            { source: "b", target: "a" },
          ],
        },
      }),
    ).toThrow("环");
    expect(() =>
      registerWorkflowSchema.parse({
        name: "ok",
        graph: {
          nodes: [{ id: "n", type: "agent", task: "x" }],
          edges: [],
        },
      }),
    ).not.toThrow();
  });
});
