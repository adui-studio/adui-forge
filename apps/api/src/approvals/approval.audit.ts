import { PrismaClient } from "../../generated/prisma-client";

export const APPROVAL_AUDIT_STORE = Symbol("APPROVAL_AUDIT_STORE");

export interface ApprovalAuditEntry {
  id: string;
  runId: string;
  toolName: string;
  input: unknown;
  reason: string;
  decision: "approved" | "rejected";
  /** 审批请求创建时间（来自 PendingApproval）。 */
  createdAt: string;
  /** 决策提交时间。 */
  decidedAt: string;
}

export interface ApprovalAuditStore {
  append(entry: ApprovalAuditEntry): Promise<void>;
  /** 按决策时间倒序的最近记录。 */
  list(limit: number): Promise<ApprovalAuditEntry[]>;
}

/** 内存审计存储（无数据库时的降级实现；进程生命周期内有效）。 */
export class InMemoryApprovalAuditStore implements ApprovalAuditStore {
  readonly #entries: ApprovalAuditEntry[] = [];

  async append(entry: ApprovalAuditEntry): Promise<void> {
    this.#entries.push(entry);
  }

  async list(limit: number): Promise<ApprovalAuditEntry[]> {
    return [...this.#entries]
      .sort((a, b) => b.decidedAt.localeCompare(a.decidedAt))
      .slice(0, limit);
  }
}

/** PostgreSQL 审计存储（Prisma）。需先 `prisma migrate deploy`。 */
export class PrismaApprovalAuditStore implements ApprovalAuditStore {
  readonly #prisma: PrismaClient;

  constructor(prisma: PrismaClient = new PrismaClient()) {
    this.#prisma = prisma;
  }

  async append(entry: ApprovalAuditEntry): Promise<void> {
    await this.#prisma.approvalAudit.create({
      data: {
        id: entry.id,
        runId: entry.runId,
        toolName: entry.toolName,
        // unknown → Json 列：经 JSON 序列化归一（与 Comparison.items 同法）
        input: JSON.parse(JSON.stringify(entry.input ?? null)) as object,
        reason: entry.reason,
        decision: entry.decision,
        createdAt: new Date(entry.createdAt),
        decidedAt: new Date(entry.decidedAt),
      },
    });
  }

  async list(limit: number): Promise<ApprovalAuditEntry[]> {
    const rows = await this.#prisma.approvalAudit.findMany({
      orderBy: { decidedAt: "desc" },
      take: limit,
    });
    return rows.map((row) => ({
      id: row.id,
      runId: row.runId,
      toolName: row.toolName,
      input:
        Array.isArray(row.input) || (row.input !== null && typeof row.input === "object")
          ? row.input
          : [],
      reason: row.reason,
      decision: row.decision === "rejected" ? "rejected" : "approved",
      createdAt: row.createdAt.toISOString(),
      decidedAt: row.decidedAt.toISOString(),
    }));
  }
}
