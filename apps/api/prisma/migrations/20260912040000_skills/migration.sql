-- CreateTable
CREATE TABLE "skills" (
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "instructions" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "skills_pkey" PRIMARY KEY ("name")
);

-- AgentConfig 增加 skills 选择
ALTER TABLE "agent_configs" ADD COLUMN "skills" JSONB NOT NULL DEFAULT '[]';
