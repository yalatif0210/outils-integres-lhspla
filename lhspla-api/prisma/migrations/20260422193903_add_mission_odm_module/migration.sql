-- CreateEnum
CREATE TYPE "MissionStatus" AS ENUM ('draft', 'pending_cop', 'cop_approved', 'pending_dg', 'in_progress', 'completed', 'cancelled');

-- AlterEnum
ALTER TYPE "BudgetStatus" ADD VALUE 'mission_cop';

-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'assistant_direction';

-- CreateTable
CREATE TABLE "Personnel" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "service" TEXT NOT NULL,
    "function" TEXT NOT NULL,
    "waveNumber" TEXT,
    "email" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Personnel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MissionRequest" (
    "id" TEXT NOT NULL,
    "initiatorId" TEXT NOT NULL,
    "budgetId" TEXT,
    "activityRefId" TEXT,
    "object" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "departureDate" TIMESTAMP(3) NOT NULL,
    "returnDate" TIMESTAMP(3) NOT NULL,
    "resumeDate" TIMESTAMP(3) NOT NULL,
    "fundId" TEXT NOT NULL,
    "requestDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "MissionStatus" NOT NULL DEFAULT 'draft',
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MissionRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MissionParticipant" (
    "id" TEXT NOT NULL,
    "missionId" TEXT NOT NULL,
    "personnelId" TEXT NOT NULL,

    CONSTRAINT "MissionParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Personnel_service_isActive_idx" ON "Personnel"("service", "isActive");

-- CreateIndex
CREATE INDEX "MissionRequest_initiatorId_idx" ON "MissionRequest"("initiatorId");

-- CreateIndex
CREATE INDEX "MissionRequest_status_idx" ON "MissionRequest"("status");

-- CreateIndex
CREATE INDEX "MissionRequest_returnDate_idx" ON "MissionRequest"("returnDate");

-- CreateIndex
CREATE INDEX "MissionRequest_fundId_idx" ON "MissionRequest"("fundId");

-- CreateIndex
CREATE INDEX "MissionParticipant_missionId_idx" ON "MissionParticipant"("missionId");

-- CreateIndex
CREATE UNIQUE INDEX "MissionParticipant_missionId_personnelId_key" ON "MissionParticipant"("missionId", "personnelId");

-- AddForeignKey
ALTER TABLE "MissionRequest" ADD CONSTRAINT "MissionRequest_initiatorId_fkey" FOREIGN KEY ("initiatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MissionRequest" ADD CONSTRAINT "MissionRequest_budgetId_fkey" FOREIGN KEY ("budgetId") REFERENCES "BudgetProject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MissionRequest" ADD CONSTRAINT "MissionRequest_activityRefId_fkey" FOREIGN KEY ("activityRefId") REFERENCES "ActivityReference"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MissionRequest" ADD CONSTRAINT "MissionRequest_fundId_fkey" FOREIGN KEY ("fundId") REFERENCES "FinancingFund"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MissionParticipant" ADD CONSTRAINT "MissionParticipant_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "MissionRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MissionParticipant" ADD CONSTRAINT "MissionParticipant_personnelId_fkey" FOREIGN KEY ("personnelId") REFERENCES "Personnel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
