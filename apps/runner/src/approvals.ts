import type { ApprovalDecision, ApprovalRequest } from "@adui-forge/agent-runtime";

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

/** 本地审批服务（ADR-006 §3）：与云端 ApprovalService 同语义——
 *  approval 级工具阻塞等待，决策经 REST 提交后 resolve。 */
export class RunnerApprovalService {
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

  decide(id: string, decision: ApprovalDecision): PendingApproval | undefined {
    const entry = this.#pending.get(id);
    if (entry === undefined) return undefined;
    this.#pending.delete(id);
    entry.resolve(decision);
    return entry.item;
  }

  pending(): PendingApproval[] {
    return [...this.#pending.values()]
      .map((entry) => entry.item)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }
}
