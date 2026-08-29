import { Injectable, NotFoundException } from "@nestjs/common";

export interface WorkflowDefinitionRecord {
  name: string;
  description: string;
  tasks: string[];
}

/** Workflow 定义注册表（内存实现；MVP 阶段定义以 tasks 序列表达）。 */
@Injectable()
export class WorkflowsRegistry {
  readonly #definitions = new Map<string, WorkflowDefinitionRecord>();

  register(definition: WorkflowDefinitionRecord): void {
    if (this.#definitions.has(definition.name)) {
      throw new Error(`workflow already registered: "${definition.name}"`);
    }
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
