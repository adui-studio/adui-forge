import { Injectable, NotFoundException } from "@nestjs/common";
import type { WorkflowGraph } from "@adui-forge/workflow";

/**
 * Workflow 定义记录。`tasks`（线性）与 `graph`（含条件分支）二选一；
 * graph 定义时 `tasks` 为其拓扑序 agent 任务文本，供列表展示与旧客户端兼容。
 */
export interface WorkflowDefinitionRecord {
  name: string;
  description: string;
  tasks: string[];
  graph?: WorkflowGraph;
}

/** Json 列的存储形态（与 WorkflowDefinitionRecord 分离，避免把派生 tasks 写库）。 */
export type StoredWorkflowDefinition = { tasks: string[] } | { graph: WorkflowGraph };

export interface WorkflowsRegistryContract {
  register(definition: WorkflowDefinitionRecord): void | Promise<void>;
  get(name: string): WorkflowDefinitionRecord | Promise<WorkflowDefinitionRecord>;
  list(): WorkflowDefinitionRecord[] | Promise<WorkflowDefinitionRecord[]>;
}

/** 图定义的兼容展示视图：拓扑序 agent 任务文本。 */
export const graphTasks = (graph: WorkflowGraph): string[] =>
  graph.nodes.filter((node) => node.type === "agent").map((node) => node.task);

export const toStored = (definition: WorkflowDefinitionRecord): StoredWorkflowDefinition =>
  definition.graph !== undefined ? { graph: definition.graph } : { tasks: definition.tasks };

export const fromStored = (
  name: string,
  description: string,
  stored: unknown,
): WorkflowDefinitionRecord => {
  if (typeof stored === "object" && stored !== null) {
    const candidate = stored as { graph?: unknown; tasks?: unknown };
    if (typeof candidate.graph === "object" && candidate.graph !== null) {
      const graph = candidate.graph as WorkflowGraph;
      return { name, description, tasks: graphTasks(graph), graph };
    }
    if (Array.isArray(candidate.tasks)) {
      return { name, description, tasks: candidate.tasks };
    }
  }
  // 兼容历史行：重命名列之前 tasks 列直接存裸字符串数组
  return { name, description, tasks: Array.isArray(stored) ? (stored as string[]) : [] };
};

/** 内存实现（同步语义）。 */
@Injectable()
export class WorkflowsRegistry implements WorkflowsRegistryContract {
  readonly #definitions = new Map<string, StoredWorkflowDefinition>();
  readonly #descriptions = new Map<string, string>();

  /** upsert 语义：编辑器保存已有定义时覆盖（与 Prisma 实现一致）。 */
  register(definition: WorkflowDefinitionRecord): void {
    this.#definitions.set(definition.name, toStored(definition));
    this.#descriptions.set(definition.name, definition.description);
  }

  get(name: string): WorkflowDefinitionRecord {
    const stored = this.#definitions.get(name);
    if (stored === undefined) {
      throw new NotFoundException(`unknown workflow: "${name}"`);
    }
    return fromStored(name, this.#descriptions.get(name) ?? "", stored);
  }

  list(): WorkflowDefinitionRecord[] {
    return [...this.#definitions.entries()].map(([name, stored]) =>
      fromStored(name, this.#descriptions.get(name) ?? "", stored),
    );
  }
}
