import { describe, expect, it } from "vite-plus/test";
import { tasksToGraph } from "../src/lib/workflow-editor.ts";

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
