-- CreateEnum
CREATE TYPE "RecallStatus" AS ENUM ('open', 'closed');

-- CreateTable
CREATE TABLE "BudgetRecall" (
    "id" TEXT NOT NULL,
    "budgetId" TEXT NOT NULL,
    "entityCode" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "RecallStatus" NOT NULL DEFAULT 'open',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "closedAt" TIMESTAMP(3),
    "closedById" TEXT,

    CONSTRAINT "BudgetRecall_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecallDocument" (
    "id" TEXT NOT NULL,
    "recallId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "fileUrl" TEXT NOT NULL DEFAULT '',
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecallDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BudgetRecall_budgetId_idx" ON "BudgetRecall"("budgetId");

-- CreateIndex
CREATE INDEX "BudgetRecall_entityCode_status_idx" ON "BudgetRecall"("entityCode", "status");

-- CreateIndex
CREATE INDEX "RecallDocument_recallId_idx" ON "RecallDocument"("recallId");

-- AddForeignKey
ALTER TABLE "BudgetRecall" ADD CONSTRAINT "BudgetRecall_budgetId_fkey" FOREIGN KEY ("budgetId") REFERENCES "BudgetProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BudgetRecall" ADD CONSTRAINT "BudgetRecall_closedById_fkey" FOREIGN KEY ("closedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecallDocument" ADD CONSTRAINT "RecallDocument_recallId_fkey" FOREIGN KEY ("recallId") REFERENCES "BudgetRecall"("id") ON DELETE CASCADE ON UPDATE CASCADE;
