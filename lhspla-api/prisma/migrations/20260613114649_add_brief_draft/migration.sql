-- CreateTable
CREATE TABLE "BriefDraft" (
    "id" TEXT NOT NULL,
    "semaineId" TEXT NOT NULL,
    "sectionB" TEXT NOT NULL,
    "sectionC" TEXT NOT NULL,
    "sectionD" TEXT NOT NULL,
    "llmModel" TEXT NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "generatedBy" TEXT NOT NULL,
    "validated" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "BriefDraft_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BriefDraft_semaineId_idx" ON "BriefDraft"("semaineId");

-- AddForeignKey
ALTER TABLE "BriefDraft" ADD CONSTRAINT "BriefDraft_semaineId_fkey" FOREIGN KEY ("semaineId") REFERENCES "Week"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BriefDraft" ADD CONSTRAINT "BriefDraft_generatedBy_fkey" FOREIGN KEY ("generatedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
