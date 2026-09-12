-- CreateTable
CREATE TABLE "comparisons" (
    "id" TEXT NOT NULL,
    "task" TEXT NOT NULL,
    "items" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "comparisons_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "comparisons_createdAt_idx" ON "comparisons"("createdAt");
