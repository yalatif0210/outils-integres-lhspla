-- CreateTable
CREATE TABLE "ActivityReference" (
    "id" TEXT NOT NULL,
    "entityCode" TEXT NOT NULL,
    "os" TEXT NOT NULL DEFAULT '',
    "oo" TEXT NOT NULL DEFAULT '',
    "activityCode" TEXT NOT NULL DEFAULT '',
    "taskId" TEXT NOT NULL DEFAULT '',
    "title" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityReference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RiskCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "RiskCategory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ActivityReference_entityCode_isActive_idx" ON "ActivityReference"("entityCode", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "RiskCategory_name_key" ON "RiskCategory"("name");
