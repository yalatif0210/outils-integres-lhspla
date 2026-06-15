-- AlterEnum
ALTER TYPE "BudgetStatus" ADD VALUE 'cloture';

-- AlterTable
ALTER TABLE "BudgetProject" ADD COLUMN     "closedAt" TIMESTAMP(3),
ADD COLUMN     "closedById" TEXT,
ADD COLUMN     "previousStatus" "BudgetStatus";

-- AddForeignKey
ALTER TABLE "BudgetProject" ADD CONSTRAINT "BudgetProject_closedById_fkey" FOREIGN KEY ("closedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
