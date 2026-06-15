-- AlterTable
ALTER TABLE "MissionRequest" ADD COLUMN     "manualBudgetRef" TEXT,
ADD COLUMN     "transportMode" TEXT;

-- CreateTable
CREATE TABLE "ConfigList" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConfigList_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ConfigList_type_idx" ON "ConfigList"("type");
