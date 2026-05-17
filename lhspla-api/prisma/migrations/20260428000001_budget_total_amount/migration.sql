-- Add totalAmount column to BudgetProject
ALTER TABLE "BudgetProject" ADD COLUMN "totalAmount" DOUBLE PRECISION NOT NULL DEFAULT 0;
