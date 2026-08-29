import { Body, Controller, Get, Inject, Param, Post } from "@nestjs/common";
import { z } from "zod";
import { UnknownApprovalError, ApprovalService, APPROVAL_SERVICE } from "./approval.service";
import { ZodValidationPipe } from "../common/zod-validation.pipe";

export const decisionSchema = z.object({
  decision: z.enum(["approved", "rejected"]),
});

@Controller("approvals")
export class ApprovalsController {
  constructor(@Inject(APPROVAL_SERVICE) private readonly approvals: ApprovalService) {}

  @Get("pending")
  list() {
    return this.approvals.list();
  }

  @Post(":id/decision")
  decide(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(decisionSchema)) input: { decision: "approved" | "rejected" },
  ) {
    const resolved = this.approvals.resolve(id, input.decision);
    if (!resolved) {
      throw new UnknownApprovalError(id);
    }
    return { ok: true, decision: input.decision };
  }
}
