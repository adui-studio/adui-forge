-- 审批决策审计（REQUIREMENTS §48）
CREATE TABLE "approval_audits" (
    "id" TEXT NOT NULL,
    "run_id" TEXT NOT NULL,
    "tool_name" TEXT NOT NULL,
    "input" JSONB NOT NULL DEFAULT '{}',
    "reason" TEXT NOT NULL DEFAULT '',
    "decision" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decided_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "approval_audits_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "approval_audits_decided_at_idx" ON "approval_audits"("decided_at");
