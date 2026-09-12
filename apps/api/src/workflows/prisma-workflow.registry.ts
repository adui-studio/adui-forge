import { NotFoundException } from "@nestjs/common";
import { PrismaClient } from "../../generated/prisma-client";
import {
  fromStored,
  toStored,
  type StoredWorkflowDefinition,
  type WorkflowsRegistryContract,
  type WorkflowDefinitionRecord,
} from "./workflow.registry";

/** PostgreSQL Workflow 定义存储（Prisma）。需先 `prisma migrate deploy`。 */
export class PrismaWorkflowsRegistry implements WorkflowsRegistryContract {
  readonly #prisma: PrismaClient;

  constructor(prisma: PrismaClient = new PrismaClient()) {
    this.#prisma = prisma;
  }

  async register(definition: WorkflowDefinitionRecord): Promise<void> {
    const stored: StoredWorkflowDefinition = toStored(definition);
    await this.#prisma.workflow.upsert({
      where: { name: definition.name },
      create: {
        name: definition.name,
        description: definition.description,
        definition: stored,
      },
      update: { description: definition.description, definition: stored },
    });
  }

  async get(name: string): Promise<WorkflowDefinitionRecord> {
    const row = await this.#prisma.workflow.findUnique({ where: { name } });
    if (row === null) {
      throw new NotFoundException(`unknown workflow: "${name}"`);
    }
    return fromStored(row.name, row.description, row.definition);
  }

  async list(): Promise<WorkflowDefinitionRecord[]> {
    const rows = await this.#prisma.workflow.findMany({ orderBy: { name: "asc" } });
    return rows.map((row) => fromStored(row.name, row.description, row.definition));
  }
}
