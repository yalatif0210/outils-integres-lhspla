/*
  Warnings:

  - You are about to drop the column `fileUrl` on the `RecallDocument` table. All the data in the column will be lost.
  - Added the required column `budgetLineId` to the `RecallDocument` table without a default value. This is not possible if the table is not empty.
  - Added the required column `filePath` to the `RecallDocument` table without a default value. This is not possible if the table is not empty.
  - Made the column `fileName` on table `RecallDocument` required. This step will fail if there are existing NULL values in that column.
  - Made the column `fileSize` on table `RecallDocument` required. This step will fail if there are existing NULL values in that column.
  - Made the column `fileType` on table `RecallDocument` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "RecallAction" AS ENUM ('created', 'doc_added', 'doc_deleted', 'closed', 'reopened');

-- AlterTable
ALTER TABLE "RecallDocument" DROP COLUMN "fileUrl",
ADD COLUMN     "budgetLineId" TEXT NOT NULL,
ADD COLUMN     "filePath" TEXT NOT NULL,
ALTER COLUMN "fileName" SET NOT NULL,
ALTER COLUMN "fileSize" SET NOT NULL,
ALTER COLUMN "fileType" SET NOT NULL;

-- CreateTable
CREATE TABLE "RecallAuditLog" (
    "id" TEXT NOT NULL,
    "recallId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" "RecallAction" NOT NULL,
    "detail" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecallAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RecallAuditLog_recallId_idx" ON "RecallAuditLog"("recallId");

-- CreateIndex
CREATE INDEX "RecallDocument_budgetLineId_idx" ON "RecallDocument"("budgetLineId");

-- AddForeignKey
ALTER TABLE "RecallDocument" ADD CONSTRAINT "RecallDocument_budgetLineId_fkey" FOREIGN KEY ("budgetLineId") REFERENCES "BudgetLine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecallAuditLog" ADD CONSTRAINT "RecallAuditLog_recallId_fkey" FOREIGN KEY ("recallId") REFERENCES "BudgetRecall"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecallAuditLog" ADD CONSTRAINT "RecallAuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
