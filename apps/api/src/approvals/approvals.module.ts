import { Module } from "@nestjs/common";
import { ApprovalService, APPROVAL_SERVICE } from "./approval.service";
import { ApprovalsController } from "./approvals.controller";
import {
  APPROVAL_AUDIT_STORE,
  InMemoryApprovalAuditStore,
  PrismaApprovalAuditStore,
} from "./approval.audit";
import { PrismaClient } from "../../generated/prisma-client";

@Module({
  controllers: [ApprovalsController],
  providers: [
    { provide: APPROVAL_SERVICE, useClass: ApprovalService },
    {
      provide: APPROVAL_AUDIT_STORE,
      useFactory: () =>
        process.env.DATABASE_URL !== undefined && process.env.DATABASE_URL !== ""
          ? new PrismaApprovalAuditStore(new PrismaClient())
          : new InMemoryApprovalAuditStore(),
    },
  ],
  // 类 ApprovalService 未作为 provider 注册（注册 token 是 APPROVAL_SERVICE 符号），
  // 导出类 token 会在 Nest 运行时抛 UnknownExportException
  exports: [APPROVAL_SERVICE],
})
export class ApprovalsModule {}
