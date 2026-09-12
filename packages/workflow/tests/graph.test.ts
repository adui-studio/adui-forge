import { describe, expect, it } from "vite-plus/test";
import type { AgentEvent } from "@adui-forge/contracts";
import { WorkflowRunner } from "../src/runner.ts";
import { evaluateCondition, graphToSteps, validateWorkflowGraph } from "../src/graph.ts";
import type { WorkflowGraph } from "../src/graph.ts";
import type { WorkflowContext } from "../src/types.ts";

const linearGraph: WorkflowGraph = {
  nodes: [
    { id: "n1", type: "agent", task: "first" },
    { id: "n2", type: "agent", task: "second" },
  ],
  edges: [{ source: "n1", target: "n2" }],
};

const branchGraph: WorkflowGraph = {
  nodes: [
    { id: "run", type: "agent", task: "run tests" },
    {
      id: "check",
      type: "condition",
      when: { node: "run", op: "contains", value: "FAIL" },
    },
    { id: "fix", type: "agent", task: "fix issues" },
    { id: "report", type: "agent", task: "write report" },
  ],
  edges: [
    { source: "run", target: "check" },
    { source: "check", target: "fix", branch: "then" },
    { source: "check", target: "report", branch: "else" },
  ],
};

describe("validateWorkflowGraph", () => {
  it("接受线性链与带标记的条件分支", () => {
    expect(() => validateWorkflowGraph(linearGraph)).not.toThrow();
    expect(() => validateWorkflowGraph(branchGraph)).not.toThrow();
  });

  it("拒绝重复 id、悬空边、自环", () => {
    expect(() =>
      validateWorkflowGraph({
        nodes: linearGraph.nodes,
        edges: [{ source: "n2", target: "ghost" }],
      }),
    ).toThrow("不存在的节点");
    expect(() =>
      validateWorkflowGraph({ nodes: linearGraph.nodes, edges: [{ source: "n1", target: "n1" }] }),
    ).toThrow("不能连接自身");
    expect(() =>
      validateWorkflowGraph({
        nodes: [
          { id: "a", type: "agent", task: "x" },
          { id: "a", type: "agent", task: "y" },
        ],
        edges: [],
      }),
    ).toThrow("id 重复");
  });

  it("拒绝分支汇合（多入边）与环", () => {
    expect(() =>
      validateWorkflowGraph({
        nodes: branchGraph.nodes,
        edges: [
          { source: "run", target: "check" },
          { source: "check", target: "fix", branch: "then" },
          { source: "check", target: "report", branch: "else" },
          { source: "fix", target: "report" },
        ],
      }),
    ).toThrow("入边");
    expect(() =>
      validateWorkflowGraph({
        nodes: linearGraph.nodes,
        edges: [
          { source: "n1", target: "n2" },
          { source: "n2", target: "n1" },
        ],
      }),
    ).toThrow("环");
  });

  it("拒绝缺 then 出边的条件节点与唯一入口约束", () => {
    expect(() =>
      validateWorkflowGraph({
        nodes: [
          { id: "c", type: "condition", when: { node: "x", op: "not_empty" } },
          { id: "c2", type: "agent", task: "y" },
        ],
        edges: [{ source: "c", target: "c2" }],
      }),
    ).toThrow("then");
    expect(() =>
      validateWorkflowGraph({
        nodes: [
          { id: "a", type: "agent", task: "x" },
          { id: "b", type: "agent", task: "y" },
        ],
        edges: [],
      }),
    ).toThrow("入口");
  });
});

describe("graphToSteps + WorkflowRunner", () => {
  it("线性图按序执行", async () => {
    let turn = 0;
    const agent = {
      async run(_task: string) {
        turn += 1;
        return { status: "completed", messages: [{ content: `out ${turn}` }] };
      },
    } as unknown as Parameters<typeof graphToSteps>[1];
    const runner = new WorkflowRunner();
    const result = await runner.run({ name: "g", steps: graphToSteps(linearGraph, agent) });
    expect(result.status).toBe("completed");
    expect(result.outputs["n1"]).toBe("out 1");
    expect(result.outputs["n2"]).toBe("out 2");
  });

  it("条件分支按输出互斥执行（then 走修复，else 走报告）", async () => {
    const calls: string[] = [];
    const agent = {
      async run(task: string) {
        calls.push(task);
        return {
          status: "completed",
          messages: [{ content: task.includes("tests") ? "tests FAIL" : "ok" }],
        };
      },
    } as unknown as Parameters<typeof graphToSteps>[1];
    const runner = new WorkflowRunner();
    const result = await runner.run({ name: "g", steps: graphToSteps(branchGraph, agent) });
    expect(result.status).toBe("completed");
    expect(calls).toEqual(["run tests", "fix issues"]);
    expect(result.outputs["fix"]).toBe("ok");
    expect(result.outputs["report"]).toBeUndefined();
  });

  it("条件为假时走 else 分支", async () => {
    const calls: string[] = [];
    const agent = {
      async run(task: string) {
        calls.push(task);
        return { status: "completed", messages: [{ content: "all good" }] };
      },
    } as unknown as Parameters<typeof graphToSteps>[1];
    const runner = new WorkflowRunner();
    const result = await runner.run({ name: "g", steps: graphToSteps(branchGraph, agent) });
    expect(result.status).toBe("completed");
    expect(calls).toEqual(["run tests", "write report"]);
    expect(result.outputs["report"]).toBe("all good");
    expect(result.outputs["fix"]).toBeUndefined();
  });
});

describe("evaluateCondition", () => {
  const context = (output: unknown) =>
    ({
      outputs: { n: output },
      inputs: {},
      signal: new AbortController().signal,
    }) as WorkflowContext;

  it("contains / equals / not_empty", () => {
    expect(
      evaluateCondition({ node: "n", op: "contains", value: "FAIL" }, context("tests FAIL")),
    ).toBe(true);
    expect(evaluateCondition({ node: "n", op: "equals", value: "ok" }, context("ok"))).toBe(true);
    expect(evaluateCondition({ node: "n", op: "not_empty" }, context(""))).toBe(false);
    expect(evaluateCondition({ node: "n", op: "not_empty" }, context(undefined))).toBe(false);
  });

  it("事件仍带 stepId 供前端分组", async () => {
    const events: AgentEvent[] = [];
    const agent = {
      async run() {
        return { status: "completed", messages: [{ content: "x" }] };
      },
    } as unknown as Parameters<typeof graphToSteps>[1];
    await new WorkflowRunner().run(
      { name: "g", steps: graphToSteps(linearGraph, agent) },
      { onEvent: (event) => events.push(event) },
    );
    expect(
      events.filter((event) => event.name === "workflow.step.started").map((e) => e.stepId),
    ).toEqual(["n1", "n2"]);
  });
});
