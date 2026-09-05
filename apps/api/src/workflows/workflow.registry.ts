import { Injectable, NotFoundException } from "@nestjs/common";

export interface WorkflowDefinitionRecord {
  name: string;
  description: string;
  tasks: string[];
}

export interface WorkflowsRegistryContract {
  register(definition: WorkflowDefinitionRecord): void | Promise<void>;
  get(name: string): WorkflowDefinitionRecord | Promise<WorkflowDefinitionRecord>;
  list(): WorkflowDefinitionRecord[] | Promise<WorkflowDefinitionRecord[]>;
}

/** 内存实现（同步语义；MVP 阶段定义以 tasks 序列表达）。 */
@Injectable()
export class WorkflowsRegistry implements WorkflowsRegistryContract {
  readonly #definitions = new Map<string, WorkflowDefinitionRecord>();

  /** upsert 语义：编辑器保存已有定义时覆盖（与 Prisma 实现一致）。 */
  register(definition: WorkflowDefinitionRecord): void {
    this.#definitions.set(definition.name, definition);
  }

  get(name: string): WorkflowDefinitionRecord {
    const definition = this.#definitions.get(name);
    if (definition === undefined) {
      throw new NotFoundException(`unknown workflow: "${name}"`);
    }
    return definition;
  }

  list(): WorkflowDefinitionRecord[] {
    return [...this.#definitions.values()];
  }
}
