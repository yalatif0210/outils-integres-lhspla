-- CreateTable
CREATE TABLE "BudgetTdrHistory" (
    "id" TEXT NOT NULL,
    "budgetId" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "fileExt" TEXT NOT NULL DEFAULT 'pdf',
    "uploadedById" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "uploadedRole" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "BudgetTdrHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BudgetTdrHistory_budgetId_idx" ON "BudgetTdrHistory"("budgetId");

-- AddForeignKey
ALTER TABLE "BudgetTdrHistory" ADD CONSTRAINT "BudgetTdrHistory_budgetId_fkey" FOREIGN KEY ("budgetId") REFERENCES "BudgetProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BudgetTdrHistory" ADD CONSTRAINT "BudgetTdrHistory_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
