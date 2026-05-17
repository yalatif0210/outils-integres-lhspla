-- CreateEnum
CREATE TYPE "MemoStatus" AS ENUM ('pending_cop', 'approved', 'rejected');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "PaymentAuditAction" ADD VALUE 'memo_approved';
ALTER TYPE "PaymentAuditAction" ADD VALUE 'memo_rejected';

-- AlterTable
ALTER TABLE "BudgetMemo" ADD COLUMN     "rejectionReason" TEXT,
ADD COLUMN     "reviewedAt" TIMESTAMP(3),
ADD COLUMN     "reviewedById" TEXT,
ADD COLUMN     "status" "MemoStatus" NOT NULL DEFAULT 'pending_cop';

-- CreateIndex
CREATE INDEX "BudgetMemo_status_idx" ON "BudgetMemo"("status");

-- AddForeignKey
ALTER TABLE "BudgetMemo" ADD CONSTRAINT "BudgetMemo_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
