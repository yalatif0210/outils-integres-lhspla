-- CreateEnum
CREATE TYPE "Role" AS ENUM ('admin_system', 'chief_of_party', 'entity_member');

-- CreateEnum
CREATE TYPE "WeekStatus" AS ENUM ('active', 'closed');

-- CreateEnum
CREATE TYPE "SubmissionStatus" AS ENUM ('draft', 'submitted');

-- CreateEnum
CREATE TYPE "CriticalityLevel" AS ENUM ('critique', 'eleve', 'modere', 'faible');

-- CreateEnum
CREATE TYPE "DosParticipation" AS ENUM ('oui', 'non');

-- CreateEnum
CREATE TYPE "SectionType" AS ENUM ('A', 'B', 'C', 'D');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "entityCode" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Week" (
    "id" TEXT NOT NULL,
    "weekReference" TEXT NOT NULL,
    "weekStart" TIMESTAMP(3) NOT NULL,
    "weekEnd" TIMESTAMP(3) NOT NULL,
    "status" "WeekStatus" NOT NULL DEFAULT 'active',
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),

    CONSTRAINT "Week_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EntitySubmission" (
    "id" TEXT NOT NULL,
    "weekId" TEXT NOT NULL,
    "entityCode" TEXT NOT NULL,
    "responsible" TEXT NOT NULL DEFAULT '',
    "submissionDate" TEXT NOT NULL DEFAULT '',
    "status" "SubmissionStatus" NOT NULL DEFAULT 'draft',
    "lastSavedAt" TIMESTAMP(3),
    "submittedAt" TIMESTAMP(3),
    "submittedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EntitySubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Activity" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL,
    "title" TEXT NOT NULL DEFAULT '',
    "objectives" TEXT NOT NULL DEFAULT '',
    "location" TEXT NOT NULL DEFAULT '',
    "dates" TEXT NOT NULL DEFAULT '',
    "recommendations" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Activity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlannedActivity" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL,
    "title" TEXT NOT NULL DEFAULT '',
    "objectives" TEXT NOT NULL DEFAULT '',
    "location" TEXT NOT NULL DEFAULT '',
    "plannedDates" TEXT NOT NULL DEFAULT '',
    "dosParticipation" "DosParticipation",
    "observations" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlannedActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RiskPoint" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL,
    "category" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "criticality" "CriticalityLevel",
    "expectedAction" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RiskPoint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SectionLock" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "section" "SectionType" NOT NULL,
    "lockedById" TEXT NOT NULL,
    "lockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SectionLock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "User_entityCode_idx" ON "User"("entityCode");

-- CreateIndex
CREATE INDEX "Week_status_idx" ON "Week"("status");

-- CreateIndex
CREATE INDEX "Week_weekStart_idx" ON "Week"("weekStart");

-- CreateIndex
CREATE INDEX "EntitySubmission_weekId_idx" ON "EntitySubmission"("weekId");

-- CreateIndex
CREATE INDEX "EntitySubmission_entityCode_idx" ON "EntitySubmission"("entityCode");

-- CreateIndex
CREATE INDEX "EntitySubmission_status_idx" ON "EntitySubmission"("status");

-- CreateIndex
CREATE UNIQUE INDEX "EntitySubmission_weekId_entityCode_key" ON "EntitySubmission"("weekId", "entityCode");

-- CreateIndex
CREATE INDEX "Activity_submissionId_orderIndex_idx" ON "Activity"("submissionId", "orderIndex");

-- CreateIndex
CREATE INDEX "PlannedActivity_submissionId_idx" ON "PlannedActivity"("submissionId");

-- CreateIndex
CREATE INDEX "RiskPoint_submissionId_idx" ON "RiskPoint"("submissionId");

-- CreateIndex
CREATE INDEX "RiskPoint_criticality_idx" ON "RiskPoint"("criticality");

-- CreateIndex
CREATE INDEX "SectionLock_expiresAt_idx" ON "SectionLock"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "SectionLock_submissionId_section_key" ON "SectionLock"("submissionId", "section");

-- CreateIndex
CREATE INDEX "Notification_userId_isRead_idx" ON "Notification"("userId", "isRead");

-- CreateIndex
CREATE INDEX "Notification_createdAt_idx" ON "Notification"("createdAt");

-- AddForeignKey
ALTER TABLE "Week" ADD CONSTRAINT "Week_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntitySubmission" ADD CONSTRAINT "EntitySubmission_weekId_fkey" FOREIGN KEY ("weekId") REFERENCES "Week"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntitySubmission" ADD CONSTRAINT "EntitySubmission_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "EntitySubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlannedActivity" ADD CONSTRAINT "PlannedActivity_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "EntitySubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiskPoint" ADD CONSTRAINT "RiskPoint_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "EntitySubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SectionLock" ADD CONSTRAINT "SectionLock_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "EntitySubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SectionLock" ADD CONSTRAINT "SectionLock_lockedById_fkey" FOREIGN KEY ("lockedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
