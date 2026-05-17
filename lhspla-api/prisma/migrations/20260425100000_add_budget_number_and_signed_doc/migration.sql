-- AlterTable "BudgetProject" — numéro de budget automatique
ALTER TABLE "BudgetProject" ADD COLUMN "budgetNumber" TEXT;

-- CreateIndex unique sur budgetNumber
CREATE UNIQUE INDEX "BudgetProject_budgetNumber_key" ON "BudgetProject"("budgetNumber");

-- AlterTable "MissionRequest" — document signé importé
ALTER TABLE "MissionRequest"
  ADD COLUMN "signedDocPath" TEXT,
  ADD COLUMN "signedDocExt"  TEXT;
