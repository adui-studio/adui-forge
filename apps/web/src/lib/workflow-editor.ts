import { MarkerType, type Edge, type Node } from "@xyflow/react";

export interface WorkflowGraphNode {
  id: string;
  type: "start" | "task" | "end";
  position: { x: number; y: number };
  data: { label: string };
}

export interface WorkflowGraphEdge {
  id: string;
  source: string;
  target: string;
  markerEnd: { type: MarkerType.ArrowClosed };
  animated?: boolean;
}

/**
 * 顺序任务链 → React Flow 图（Start → Task… → End）。
 * 运行时格式始终是 tasks[]，画布只是可视化/编辑视图（REQUIREMENTS §40）。
 */
export const tasksToGraph = (
  tasks: string[],
): {
  nodes: Node[];
  edges: Edge[];
} => {
  const nodes: Node[] = [
    { id: "start", type: "start", position: { x: 200, y: 0 }, data: { label: "开始" } },
    ...tasks.map((task, index) => ({
      id: `task-${index}`,
      type: "task",
      position: { x: 200, y: (index + 1) * 110 },
      data: { label: task, index },
    })),
    {
      id: "end",
      type: "end",
      position: { x: 200, y: (tasks.length + 1) * 110 },
      data: { label: "结束" },
    },
  ];

  const ids = ["start", ...tasks.map((_, index) => `task-${index}`), "end"];
  const edges: Edge[] = ids.slice(0, -1).map((source, index) => ({
    id: `edge-${source}-${ids[index + 1]}`,
    source,
    target: ids[index + 1] ?? "end",
    markerEnd: { type: MarkerType.ArrowClosed },
  }));

  return { nodes, edges };
};
