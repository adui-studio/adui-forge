import { Module } from "@nestjs/common";
import { ApprovalService, APPROVAL_SERVICE } from "./approval.service";
import { ApprovalsController } from "./approvals.controller";

@Module({
  controllers: [ApprovalsController],
  providers: [{ provide: APPROVAL_SERVICE, useClass: ApprovalService }],
  exports: [ApprovalService, APPROVAL_SERVICE],
})
export class ApprovalsModule {}
