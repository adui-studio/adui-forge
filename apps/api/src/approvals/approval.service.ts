import { Injectable, NotFoundException } from "@nestjs/common";
import type { ApprovalDecision, ApprovalRequest } from "@adui-forge/agent-runtime";

export const APPROVAL_SERVICE = Symbol("APPROVAL_SERVICE");

export interface PendingApproval {
  id: string;
  runId: string;
  toolName: string;
  input: unknown;
  reason: string;
  createdAt: string;
}

interface PendingEntry {
  item: PendingApproval;
  resolve: (decision: ApprovalDecision) => void;
}

/**
 * 运行中审批服务（REQUIREMENTS.md §48）：
 * Agent Loop 在 approval 级工具上阻塞等待，审批决策经 REST 提交后
 * resolve 对应的 Promise，Loop 继续推进——形成完整的人工审批闭环。
 */
@Injectable()
export class ApprovalService {
  readonly #pending = new Map<string, PendingEntry>();

  createPending(request: ApprovalRequest): {
    item: PendingApproval;
    promise: Promise<ApprovalDecision>;
  } {
    const id = `appr_${globalThis.crypto.randomUUID()}`;
    const entry: PendingEntry = {
      item: {
        id,
        runId: request.runId,
        toolName: request.toolName,
        input: request.input,
        reason: request.reason,
        createdAt: new Date().toISOString(),
      },
      resolve: () => {},
    };
    const promise = new Promise<ApprovalDecision>((resolve) => {
      entry.resolve = resolve;
    });
    this.#pending.set(id, entry);
    return { item: entry.item, promise };
  }

  list(): PendingApproval[] {
    return [...this.#pending.values()].map((entry) => entry.item);
  }

  resolve(id: string, decision: ApprovalDecision): boolean {
    const entry = this.#pending.get(id);
    if (entry === undefined) {
      return false;
    }
    this.#pending.delete(id);
    entry.resolve(decision);
    return true;
  }
}

export class UnknownApprovalError extends NotFoundException {
  constructor(id: string) {
    super(`unknown approval: "${id}"`);
  }
}
