import { z } from "zod";
import type { Agent } from "@adui-forge/agent";
import type { WorkflowContext, WorkflowStep } from "./types.ts";

/**
 * 可序列化的 Workflow 图定义（编辑器 ↔ API 的传输格式）。
 * 运行时始终编译为 `WorkflowStep[]`（REQUIREMENTS §40：运行时不依赖编辑器格式）。
 *
 * MVP 语义约束：
 * - 每个节点最多一条入边（唯一路径语义），即整图是一棵从入口展开的树；
 *   分支暂不支持重新汇合，汇合节点会在校验时被拒绝。
 * - 无环；条件节点必须有一条 `then` 出边，`else` 可选。
 */

export const workflowConditionSchema = z.object({
  /** 断言取值来源：指定节点的输出（该节点必须在此条件之前执行）。 */
  node: z.string().min(1),
  op: z.enum(["contains", "equals", "not_empty"]),
  value: z.string().max(10_000).optional(),
});

export const workflowGraphNodeSchema = z.discriminatedUnion("type", [
  z.object({
    id: z
      .string()
      .min(1)
      .max(64)
      .regex(/^[a-zA-Z0-9_-]+$/),
    type: z.literal("agent"),
    task: z.string().min(1).max(10_000),
  }),
  z.object({
    id: z
      .string()
      .min(1)
      .max(64)
      .regex(/^[a-zA-Z0-9_-]+$/),
    type: z.literal("condition"),
    when: workflowConditionSchema,
  }),
]);

export const workflowGraphEdgeSchema = z.object({
  source: z.string().min(1),
  target: z.string().min(1),
  /** 仅 condition 节点的出边需要标记分支。 */
  branch: z.enum(["then", "else"]).optional(),
});

export const workflowGraphSchema = z.object({
  nodes: z.array(workflowGraphNodeSchema).min(1).max(50),
  edges: z.array(workflowGraphEdgeSchema).max(100),
});

export type WorkflowGraphNode = z.infer<typeof workflowGraphNodeSchema>;
export type WorkflowGraphEdge = z.infer<typeof workflowGraphEdgeSchema>;
export type WorkflowGraph = z.infer<typeof workflowGraphSchema>;
export type WorkflowCondition = z.infer<typeof workflowConditionSchema>;

/** 序列化条件断言 → 运行时谓词。 */
export const evaluateCondition = (when: WorkflowCondition, context: WorkflowContext): boolean => {
  const output = context.outputs[when.node];
  // 输出可能为对象：JSON 序列化后做文本断言，避免 "[object Object]"
  const text =
    output === undefined || output === null
      ? ""
      : typeof output === "string"
        ? output
        : JSON.stringify(output);
  switch (when.op) {
    case "not_empty":
      return text.trim().length > 0;
    case "equals":
      return text === (when.value ?? "");
    case "contains":
      return text.includes(when.value ?? "");
  }
};

/**
 * 结构校验：重复 id / 悬空边 / 多入边（非树）/ 环 / 条件节点分支完整性。
 * 抛出的 Error message 面向编辑器直接展示。
 */
export const validateWorkflowGraph = (graph: WorkflowGraph): void => {
  const byId = new Map<string, WorkflowGraphNode>();
  for (const node of graph.nodes) {
    if (byId.has(node.id)) {
      throw new Error(`节点 id 重复: "${node.id}"`);
    }
    byId.set(node.id, node);
  }

  const outEdges = new Map<string, WorkflowGraphEdge[]>();
  const inDegree = new Map<string, number>();
  for (const edge of graph.edges) {
    if (!byId.has(edge.source) || !byId.has(edge.target)) {
      throw new Error(`边 ${edge.source} → ${edge.target} 指向不存在的节点`);
    }
    if (edge.source === edge.target) {
      throw new Error(`节点 "${edge.source}" 不能连接自身`);
    }
    const list = outEdges.get(edge.source) ?? [];
    list.push(edge);
    outEdges.set(edge.source, list);
    inDegree.set(edge.target, (inDegree.get(edge.target) ?? 0) + 1);
  }

  for (const node of graph.nodes) {
    const incoming = inDegree.get(node.id) ?? 0;
    if (incoming > 1) {
      throw new Error(
        `节点 "${node.id}" 有 ${incoming} 条入边；当前版本要求每个节点只有一条执行路径（分支不可汇合）`,
      );
    }
    if (node.type === "agent" && (outEdges.get(node.id)?.length ?? 0) > 1) {
      throw new Error(`Agent 节点 "${node.id}" 只能有一条出边（分支请使用条件节点）`);
    }
    if (node.type === "condition") {
      const branches = outEdges.get(node.id) ?? [];
      const then = branches.filter((edge) => edge.branch === "then");
      const elseEdges = branches.filter((edge) => edge.branch === "else");
      if (then.length !== 1) {
        throw new Error(`条件节点 "${node.id}" 必须有一条 "then" 出边`);
      }
      if (elseEdges.length > 1) {
        throw new Error(`条件节点 "${node.id}" 最多一条 "else" 出边`);
      }
      if (branches.length !== then.length + elseEdges.length) {
        throw new Error(`条件节点 "${node.id}" 的出边必须标记 then / else 分支`);
      }
    }
  }

  // 环检测：从每个入度为 0 的节点 DFS，标记递归栈
  const state = new Map<string, "visiting" | "done">();
  const visit = (id: string): void => {
    const current = state.get(id);
    if (current === "visiting") {
      throw new Error(`Workflow 存在环，涉及节点 "${id}"`);
    }
    if (current === "done") return;
    state.set(id, "visiting");
    for (const edge of outEdges.get(id) ?? []) visit(edge.target);
    state.set(id, "done");
  };
  for (const node of graph.nodes) {
    if ((inDegree.get(node.id) ?? 0) === 0) visit(node.id);
  }
  // 入度为 0 的节点可能不在环上但被环覆盖，全部再走一遍兜底
  for (const node of graph.nodes) visit(node.id);

  const entries = graph.nodes.filter((node) => (inDegree.get(node.id) ?? 0) === 0);
  if (entries.length !== 1) {
    throw new Error(`Workflow 必须有唯一入口节点，当前有 ${entries.length} 个`);
  }

  // 条件断言引用的节点必须出现在图中（是否必然先执行由运行时输出兜底为空串）
  for (const node of graph.nodes) {
    if (node.type === "condition" && !byId.has(node.when.node)) {
      throw new Error(`条件节点 "${node.id}" 引用了不存在的节点 "${node.when.node}"`);
    }
  }
};

/**
 * 图定义 → 运行时 `WorkflowStep[]`。调用前必须先通过 `validateWorkflowGraph`。
 * 所有 agent 节点共用传入的 agent 实例（与线性 tasks 语义一致）。
 *
 * 运行时的 condition 是"为真执行、为假跳过、随后继续"，不表达互斥分支；
 * 因此编译 if/else 时生成一对取反断言：
 *   [cond] { then 链 } → [!cond] { else 链 }
 * 条件节点是链的终点——两分支内部各自延伸（分支不可汇合，见 validateWorkflowGraph）。
 */
export const graphToSteps = (graph: WorkflowGraph, agent: Agent): WorkflowStep[] => {
  validateWorkflowGraph(graph);
  const byId = new Map(graph.nodes.map((node) => [node.id, node]));
  const outEdges = new Map<string, WorkflowGraphEdge[]>();
  for (const edge of graph.edges) {
    const list = outEdges.get(edge.source) ?? [];
    list.push(edge);
    outEdges.set(edge.source, list);
  }

  const compileChain = (nodeId: string): WorkflowStep[] => {
    const steps: WorkflowStep[] = [];
    let current = byId.get(nodeId);
    while (current !== undefined) {
      if (current.type === "agent") {
        steps.push({ id: current.id, type: "agent", agent, task: current.task });
        current = byId.get(outEdges.get(current.id)?.[0]?.target ?? "");
        continue;
      }
      const branches = outEdges.get(current.id) ?? [];
      const then = branches.find((edge) => edge.branch === "then");
      const otherwise = branches.find((edge) => edge.branch === "else");
      const condition = current.when;
      steps.push({
        id: current.id,
        type: "condition",
        when: (context) => evaluateCondition(condition, context),
        steps: then === undefined ? [] : compileChain(then.target),
      });
      if (otherwise !== undefined) {
        steps.push({
          id: `${current.id}_else`,
          type: "condition",
          when: (context) => !evaluateCondition(condition, context),
          steps: compileChain(otherwise.target),
        });
      }
      break;
    }
    return steps;
  };

  const entry = graph.nodes.find(
    (node) => graph.edges.filter((edge) => edge.target === node.id).length === 0,
  );
  return compileChain(entry?.id ?? "");
};
