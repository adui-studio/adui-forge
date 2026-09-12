-- 图定义支持：tasks JSONB 重命名为 definition，可存放线性 tasks 或 graph 定义
ALTER TABLE "workflows" RENAME COLUMN "tasks" TO "definition";
