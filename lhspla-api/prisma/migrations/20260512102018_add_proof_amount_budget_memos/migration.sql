-- CreateEnum
CREATE TYPE "MemoCategory" AS ENUM ('rallonge_budgetaire', 'reduction_budgetaire', 'sans_incidence');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "PaymentAuditAction" ADD VALUE 'proof_added';
ALTER TYPE "PaymentAuditAction" ADD VALUE 'memo_created';
ALTER TYPE "PaymentAuditAction" ADD VALUE 'memo_deleted';

-- AlterTable
ALTER TABLE "PaymentProof" ADD COLUMN     "amount" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "BudgetMemo" (
    "id" TEXT NOT NULL,
    "budgetId" TEXT NOT NULL,
    "category" "MemoCategory" NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "content" TEXT,
    "filePath" TEXT,
    "fileName" TEXT,
    "fileType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT NOT NULL,

    CONSTRAINT "BudgetMemo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BudgetMemo_budgetId_idx" ON "BudgetMemo"("budgetId");

-- AddForeignKey
ALTER TABLE "BudgetMemo" ADD CONSTRAINT "BudgetMemo_budgetId_fkey" FOREIGN KEY ("budgetId") REFERENCES "BudgetProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BudgetMemo" ADD CONSTRAINT "BudgetMemo_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
