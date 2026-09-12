import { describe, expect, it } from "vite-plus/test";
import type { Edge, Node } from "@xyflow/react";
import type { WorkflowGraph } from "@adui-forge/workflow";
import { flowToGraph, graphToFlow, tasksToGraph } from "../src/lib/workflow-editor.ts";

describe("tasksToGraph", () => {
  it("builds a Start → tasks → End chain", () => {
    const { nodes, edges } = tasksToGraph(["审查改动", "补充测试"]);
    expect(nodes.map((node) => node.type)).toEqual(["start", "task", "task", "end"]);
    expect(nodes[1]?.data.label).toBe("审查改动");
    expect(edges).toHaveLength(3);
    expect(edges[0]).toMatchObject({ source: "start", target: "task-0" });
    expect(edges[2]).toMatchObject({ source: "task-1", target: "end" });
  });

  it("handles an empty chain (Start → End)", () => {
    const { nodes, edges } = tasksToGraph([]);
    expect(nodes).toHaveLength(2);
    expect(edges).toHaveLength(1);
    expect(edges[0]).toMatchObject({ source: "start", target: "end" });
  });

  it("positions nodes vertically without overlap", () => {
    const { nodes } = tasksToGraph(["a", "b", "c"]);
    const ys = nodes.map((node) => node.position.y);
    expect(new Set(ys).size).toBe(ys.length);
  });
});

describe("graph ↔ flow 双向映射", () => {
  const branchGraph: WorkflowGraph = {
    nodes: [
      { id: "n1", type: "agent", task: "run tests" },
      { id: "c1", type: "condition", when: { node: "n1", op: "contains", value: "FAIL" } },
      { id: "n2", type: "agent", task: "fix issues" },
      { id: "n3", type: "agent", task: "write report" },
    ],
    edges: [
      { source: "n1", target: "c1" },
      { source: "c1", target: "n2", branch: "then" },
      { source: "c1", target: "n3", branch: "else" },
    ],
  };

  it("graphToFlow 渲染 agent/condition 节点并带分支标签", () => {
    const { nodes, edges } = graphToFlow(branchGraph);
    expect(nodes.map((node) => node.type)).toEqual(["task", "condition", "task", "task"]);
    const thenEdge = edges.find((edge) => edge.data?.branch === "then");
    expect(thenEdge?.label).toBe("是");
    expect(thenEdge?.animated).toBe(true);
  });

  it("flowToGraph 忽略 start/end 视图节点，还原域图", () => {
    const view = graphToFlow(branchGraph);
    const withPseudo = {
      nodes: [
        { id: "start", type: "start", position: { x: 0, y: 0 }, data: { label: "开始" } },
        ...view.nodes,
        { id: "end", type: "end", position: { x: 0, y: 0 }, data: { label: "结束" } },
      ] as Node[],
      edges: [
        { id: "e0", source: "start", target: "n1" },
        ...view.edges,
        { id: "e9", source: "n3", target: "end" },
      ] as Edge[],
    };
    const graph = flowToGraph(withPseudo.nodes, withPseudo.edges);
    expect(graph).not.toBeNull();
    expect(graph?.nodes.filter((node) => node.type === "agent")).toHaveLength(3);
    expect(graph?.edges.filter((edge) => edge.branch === "then")).toHaveLength(1);
    // start/end 之间的伪边被剔除
    expect(graph?.edges.some((edge) => edge.source === "start")).toBe(false);
  });

  it("flowToGraph 空画布返回 null", () => {
    expect(flowToGraph([], [])).toBeNull();
  });
});

describe("节点坐标持久化", () => {
  it("graphToFlow 优先使用存储的画布坐标", () => {
    const graph: WorkflowGraph = {
      nodes: [
        { id: "n1", type: "agent", task: "a", position: { x: 500, y: 300 } },
        { id: "c1", type: "condition", when: { node: "n1", op: "not_empty" } },
      ],
      edges: [{ source: "n1", target: "c1" }],
    };
    const { nodes } = graphToFlow(graph);
    expect(nodes[0]?.position).toEqual({ x: 500, y: 300 });
    // 未存坐标的节点走分层布局兜底
    expect(nodes[1]?.position).toBeDefined();
  });

  it("flowToGraph 把画布坐标写回域图", () => {
    const nodes = [
      { id: "n1", type: "task", position: { x: 210, y: 90 }, data: { label: "a", task: "a" } },
    ] as Node[];
    const graph = flowToGraph(nodes, []);
    expect(graph?.nodes[0]?.position).toEqual({ x: 210, y: 90 });
  });
});
