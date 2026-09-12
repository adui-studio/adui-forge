-- 命名模型目录：自定义 Agent 可指定模型；空串 = 默认模型
ALTER TABLE "agent_configs" ADD COLUMN "model" TEXT NOT NULL DEFAULT '';
