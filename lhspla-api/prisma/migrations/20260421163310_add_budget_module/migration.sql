-- CreateEnum
CREATE TYPE "BudgetType" AS ENUM ('ATELIER', 'ACHAT_FOURNITURES', 'MISSION_TERRAIN', 'APPUIS');

-- CreateEnum
CREATE TYPE "BudgetStatus" AS ENUM ('draft', 'submitted', 'approved', 'rejected', 'archived');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "Role" ADD VALUE 'super_admin';
ALTER TYPE "Role" ADD VALUE 'admin_finance';

-- CreateTable
CREATE TABLE "FinancingFund" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "FinancingFund_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BudgetProject" (
    "id" TEXT NOT NULL,
    "entityCode" TEXT NOT NULL,
    "budgetType" "BudgetType" NOT NULL,
    "title" TEXT NOT NULL,
    "fundId" TEXT NOT NULL,
    "status" "BudgetStatus" NOT NULL DEFAULT 'draft',
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "submittedAt" TIMESTAMP(3),
    "reviewedAt" TIMESTAMP(3),
    "reviewedById" TEXT,

    CONSTRAINT "BudgetProject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BudgetLine" (
    "id" TEXT NOT NULL,
    "budgetId" TEXT NOT NULL,
    "rowKey" TEXT NOT NULL,
    "designation" TEXT NOT NULL DEFAULT '',
    "unitCost" DOUBLE PRECISION,
    "quantity" DOUBLE PRECISION,
    "frequency" DOUBLE PRECISION,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BudgetLine_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FinancingFund_name_key" ON "FinancingFund"("name");

-- CreateIndex
CREATE UNIQUE INDEX "FinancingFund_code_key" ON "FinancingFund"("code");

-- CreateIndex
CREATE INDEX "BudgetProject_entityCode_budgetType_idx" ON "BudgetProject"("entityCode", "budgetType");

-- CreateIndex
CREATE INDEX "BudgetProject_status_idx" ON "BudgetProject"("status");

-- CreateIndex
CREATE INDEX "BudgetProject_fundId_idx" ON "BudgetProject"("fundId");

-- CreateIndex
CREATE INDEX "BudgetLine_budgetId_idx" ON "BudgetLine"("budgetId");

-- CreateIndex
CREATE UNIQUE INDEX "BudgetLine_budgetId_rowKey_key" ON "BudgetLine"("budgetId", "rowKey");

-- AddForeignKey
ALTER TABLE "BudgetProject" ADD CONSTRAINT "BudgetProject_fundId_fkey" FOREIGN KEY ("fundId") REFERENCES "FinancingFund"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BudgetProject" ADD CONSTRAINT "BudgetProject_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BudgetLine" ADD CONSTRAINT "BudgetLine_budgetId_fkey" FOREIGN KEY ("budgetId") REFERENCES "BudgetProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;
