import { NotFoundException } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import type { WorkflowDefinitionRecord, WorkflowsRegistryContract } from "./workflow.registry";

/** PostgreSQL Workflow 定义存储（Prisma）。需先 `prisma migrate deploy`。 */
export class PrismaWorkflowsRegistry implements WorkflowsRegistryContract {
  readonly #prisma: PrismaClient;

  constructor(prisma: PrismaClient = new PrismaClient()) {
    this.#prisma = prisma;
  }

  async register(definition: WorkflowDefinitionRecord): Promise<void> {
    await this.#prisma.workflow.upsert({
      where: { name: definition.name },
      create: {
        name: definition.name,
        description: definition.description,
        tasks: definition.tasks,
      },
      update: { description: definition.description, tasks: definition.tasks },
    });
  }

  async get(name: string): Promise<WorkflowDefinitionRecord> {
    const row = await this.#prisma.workflow.findUnique({ where: { name } });
    if (row === null) {
      throw new NotFoundException(`unknown workflow: "${name}"`);
    }
    return { name: row.name, description: row.description, tasks: row.tasks as string[] };
  }

  async list(): Promise<WorkflowDefinitionRecord[]> {
    const rows = await this.#prisma.workflow.findMany({ orderBy: { name: "asc" } });
    return rows.map((row) => ({
      name: row.name,
      description: row.description,
      tasks: row.tasks as string[],
    }));
  }
}
