-- Ajouter finance_reviewed au enum BudgetStatus
ALTER TYPE "BudgetStatus" ADD VALUE IF NOT EXISTS 'finance_reviewed';

-- Ajouter les champs de revue finance sur BudgetProject
ALTER TABLE "BudgetProject" ADD COLUMN IF NOT EXISTS "financeReviewedAt" TIMESTAMP(3);
ALTER TABLE "BudgetProject" ADD COLUMN IF NOT EXISTS "financeReviewedById" TEXT;

-- Contrainte FK vers User
ALTER TABLE "BudgetProject" DROP CONSTRAINT IF EXISTS "BudgetProject_financeReviewedById_fkey";
ALTER TABLE "BudgetProject" ADD CONSTRAINT "BudgetProject_financeReviewedById_fkey"
  FOREIGN KEY ("financeReviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
