-- CreateTable
CREATE TABLE "workflows" (
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "tasks" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workflows_pkey" PRIMARY KEY ("name")
);
