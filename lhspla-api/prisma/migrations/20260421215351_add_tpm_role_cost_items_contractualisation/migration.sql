-- AlterEnum
ALTER TYPE "BudgetStatus" ADD VALUE 'tpm_approved';

-- AlterEnum
ALTER TYPE "BudgetType" ADD VALUE 'CONTRACTUALISATION';

-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'admin_tpm';

-- AlterTable
ALTER TABLE "BudgetLine" ADD COLUMN     "costItemId" TEXT;

-- AlterTable
ALTER TABLE "BudgetProject" ADD COLUMN     "activityReferenceId" TEXT,
ADD COLUMN     "exchangeRate" DOUBLE PRECISION NOT NULL DEFAULT 655,
ADD COLUMN     "rejectedAt" TIMESTAMP(3),
ADD COLUMN     "tpmReviewedAt" TIMESTAMP(3),
ADD COLUMN     "tpmReviewedById" TEXT,
ADD COLUMN     "transferFeeRate" DOUBLE PRECISION NOT NULL DEFAULT 0.05;

-- AlterTable
ALTER TABLE "RecallDocument" ADD COLUMN     "fileName" TEXT,
ADD COLUMN     "fileSize" INTEGER,
ADD COLUMN     "fileType" TEXT;

-- CreateTable
CREATE TABLE "CostItem" (
    "id" TEXT NOT NULL,
    "nature" TEXT NOT NULL,
    "designation" TEXT NOT NULL,
    "unitCost" DOUBLE PRECISION NOT NULL,
    "justificatif" TEXT NOT NULL DEFAULT '',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CostItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CostItem_nature_isActive_idx" ON "CostItem"("nature", "isActive");

-- AddForeignKey
ALTER TABLE "BudgetProject" ADD CONSTRAINT "BudgetProject_activityReferenceId_fkey" FOREIGN KEY ("activityReferenceId") REFERENCES "ActivityReference"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BudgetProject" ADD CONSTRAINT "BudgetProject_tpmReviewedById_fkey" FOREIGN KEY ("tpmReviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BudgetLine" ADD CONSTRAINT "BudgetLine_costItemId_fkey" FOREIGN KEY ("costItemId") REFERENCES "CostItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
