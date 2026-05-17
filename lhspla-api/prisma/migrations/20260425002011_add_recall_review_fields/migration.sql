-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "RecallAction" ADD VALUE 'doc_approved';
ALTER TYPE "RecallAction" ADD VALUE 'doc_rejected';
ALTER TYPE "RecallAction" ADD VALUE 'rejected';
ALTER TYPE "RecallAction" ADD VALUE 'cancelled';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "RecallStatus" ADD VALUE 'rejected';
ALTER TYPE "RecallStatus" ADD VALUE 'cancelled';

-- AlterTable
ALTER TABLE "BudgetRecall" ADD COLUMN     "cancelledAt" TIMESTAMP(3),
ADD COLUMN     "rejectionReason" TEXT;

-- AlterTable
ALTER TABLE "RecallDocument" ADD COLUMN     "docStatus" TEXT NOT NULL DEFAULT 'pending',
ADD COLUMN     "rejectionNote" TEXT,
ADD COLUMN     "reviewedAt" TIMESTAMP(3),
ADD COLUMN     "reviewedById" TEXT;

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "roles" DROP DEFAULT;
