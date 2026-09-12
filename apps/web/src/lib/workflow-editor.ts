import { MarkerType, type Edge, type Node } from "@xyflow/react";
import type { WorkflowGraph } from "@adui-forge/workflow";

export interface WorkflowGraphConditionData {
  node: string;
  op: "contains" | "equals" | "not_empty";
  value?: string;
}

export interface WorkflowGraphEdge {
  id: string;
  source: string;
  target: string;
  markerEnd: { type: MarkerType.ArrowClosed };
  animated?: boolean;
  label?: string;
  data?: { branch?: "then" | "else" };
}

/** 线性任务链 → React Flow 图（Start → Task… → End）。旧格式编辑视图。 */
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

/** 简单分层布局：从入口 BFS，深度 → x，同层序号 → y。 */
const layoutGraph = (graph: WorkflowGraph): Map<string, { x: number; y: number }> => {
  const outEdges = new Map<string, string[]>();
  const inDegree = new Map<string, number>();
  for (const edge of graph.edges) {
    outEdges.set(edge.source, [...(outEdges.get(edge.source) ?? []), edge.target]);
    inDegree.set(edge.target, (inDegree.get(edge.target) ?? 0) + 1);
  }
  const positions = new Map<string, { x: number; y: number }>();
  const entries = graph.nodes.filter((node) => (inDegree.get(node.id) ?? 0) === 0);
  const queue = entries.map((node) => ({ id: node.id, depth: 0 }));
  const perDepth = new Map<number, number>();
  while (queue.length > 0) {
    const { id, depth } = queue.shift() ?? { id: "", depth: 0 };
    if (positions.has(id)) continue;
    const row = perDepth.get(depth) ?? 0;
    perDepth.set(depth, row + 1);
    positions.set(id, { x: 80 + depth * 300, y: 40 + row * 130 });
    for (const target of outEdges.get(id) ?? []) {
      queue.push({ id: target, depth: depth + 1 });
    }
  }
  // 兜底：不可达节点（校验失败前的编辑中间态）排到末尾
  let fallbackRow = 0;
  for (const node of graph.nodes) {
    if (!positions.has(node.id)) {
      positions.set(node.id, { x: 80, y: 40 + (fallbackRow += 1) * 130 });
    }
  }
  return positions;
};

/** 域图 → React Flow 编辑视图（agent/condition 节点 + branch 标签边）。
 *  节点已保存过画布坐标时优先使用，否则按分层布局摆放。 */
export const graphToFlow = (graph: WorkflowGraph): { nodes: Node[]; edges: Edge[] } => {
  const fallback = layoutGraph(graph);
  const nodes: Node[] = graph.nodes.map((node) => {
    const position = node.position ?? fallback.get(node.id) ?? { x: 80, y: 40 };
    if (node.type === "agent") {
      return { id: node.id, type: "task", position, data: { label: node.task, task: node.task } };
    }
    return {
      id: node.id,
      type: "condition",
      position,
      data: { label: "条件", when: node.when },
    };
  });
  const edges: Edge[] = graph.edges.map((edge) => ({
    id: `edge-${edge.source}-${edge.target}`,
    source: edge.source,
    target: edge.target,
    markerEnd: { type: MarkerType.ArrowClosed },
    animated: edge.branch !== undefined,
    label: edge.branch === "then" ? "是" : edge.branch === "else" ? "否" : undefined,
    data: { branch: edge.branch },
  }));
  return { nodes, edges };
};

/** React Flow 节点 data 为 Record<string, unknown>，安全取任务文本。 */
export const nodeText = (data: Record<string, unknown>, fallback = ""): string => {
  const raw = data.task ?? data.label;
  return typeof raw === "string" ? raw : fallback;
};

/**
 * 编辑视图 → 域图。忽略 start/end 视图节点；
 * 条件节点出边按 data.branch 携带 then/else。
 * 返回 null 表示画布上没有可执行节点。
 */
export const flowToGraph = (nodes: Node[], edges: Edge[]): WorkflowGraph | null => {
  const domainNodes = nodes
    .filter((node) => node.type === "task" || node.type === "condition")
    .map((node) =>
      node.type === "task"
        ? {
            id: node.id,
            type: "agent" as const,
            task: nodeText(node.data),
            // 画布坐标随定义持久化（编辑器视图提示，运行时忽略）
            position: { x: node.position.x, y: node.position.y },
          }
        : {
            id: node.id,
            type: "condition" as const,
            when: (node.data.when as WorkflowGraphConditionData | undefined) ?? {
              node: "",
              op: "not_empty" as const,
            },
            position: { x: node.position.x, y: node.position.y },
          },
    );
  if (domainNodes.length === 0) return null;
  const domainIds = new Set(domainNodes.map((node) => node.id));
  const domainEdges = edges
    .filter((edge) => domainIds.has(edge.source) && domainIds.has(edge.target))
    .map((edge) => {
      const branch = (edge.data as { branch?: "then" | "else" } | undefined)?.branch;
      return branch === undefined
        ? { source: edge.source, target: edge.target }
        : { source: edge.source, target: edge.target, branch };
    });
  return { nodes: domainNodes, edges: domainEdges };
};
