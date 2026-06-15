-- CreateEnum
CREATE TYPE "Programme" AS ENUM ('PNLS', 'PNLP', 'PNSME');

-- CreateEnum
CREATE TYPE "StockStatus" AS ENUM ('RUPTURE_PAYS', 'RUPTURE_CENTRALE', 'RUPTURE_IMMINENTE', 'RISQUE', 'BON_STOCKAGE', 'SURSTOCK', 'RISQUE_PEREMPTION');

-- CreateEnum
CREATE TYPE "SourceReapprovisionnement" AS ENUM ('GOVCI', 'FM', 'PEPFAR', 'UNFPA', 'USG', 'MOU_USG', 'AUTRE');

-- CreateTable
CREATE TABLE "RefDenomination" (
    "id" TEXT NOT NULL,
    "programme" "Programme" NOT NULL,
    "sousCategorie" TEXT NOT NULL,
    "denomination" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RefDenomination_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockEntry" (
    "id" TEXT NOT NULL,
    "semaine" TIMESTAMP(3) NOT NULL,
    "programme" "Programme" NOT NULL,
    "sousCategorie" TEXT NOT NULL,
    "denomination" TEXT NOT NULL,
    "denominationId" TEXT,
    "stockCentralMsd" DECIMAL(6,2),
    "statutStock" "StockStatus" NOT NULL,
    "statutOverride" BOOLEAN NOT NULL DEFAULT false,
    "stockPeripherique" BIGINT NOT NULL DEFAULT 0,
    "sourceReapprovisionnement" "SourceReapprovisionnement",
    "quantiteAttendue" BIGINT NOT NULL DEFAULT 0,
    "dateLivraisonPrevue" TIMESTAMP(3),
    "commentaire" TEXT NOT NULL DEFAULT '',
    "saisiePar" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StockEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "semaine" TIMESTAMP(3) NOT NULL,
    "nbImported" INTEGER NOT NULL DEFAULT 0,
    "nbErrors" INTEGER NOT NULL DEFAULT 0,
    "nbDuplicates" INTEGER NOT NULL DEFAULT 0,
    "report" JSONB,
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImportLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BriefHistory" (
    "id" TEXT NOT NULL,
    "semaineRapportage" TIMESTAMP(3) NOT NULL,
    "dateGeneration" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "generePar" TEXT NOT NULL,
    "hashContenu" TEXT NOT NULL,
    "cheminFichier" TEXT NOT NULL,
    "archived" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "BriefHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RefDenomination_programme_sousCategorie_idx" ON "RefDenomination"("programme", "sousCategorie");

-- CreateIndex
CREATE UNIQUE INDEX "RefDenomination_denomination_programme_key" ON "RefDenomination"("denomination", "programme");

-- CreateIndex
CREATE INDEX "StockEntry_semaine_programme_idx" ON "StockEntry"("semaine", "programme");

-- CreateIndex
CREATE INDEX "StockEntry_statutStock_idx" ON "StockEntry"("statutStock");

-- CreateIndex
CREATE UNIQUE INDEX "StockEntry_semaine_denomination_programme_key" ON "StockEntry"("semaine", "denomination", "programme");

-- CreateIndex
CREATE INDEX "ImportLog_userId_idx" ON "ImportLog"("userId");

-- CreateIndex
CREATE INDEX "ImportLog_semaine_idx" ON "ImportLog"("semaine");

-- CreateIndex
CREATE INDEX "BriefHistory_semaineRapportage_idx" ON "BriefHistory"("semaineRapportage");

-- AddForeignKey
ALTER TABLE "StockEntry" ADD CONSTRAINT "StockEntry_denominationId_fkey" FOREIGN KEY ("denominationId") REFERENCES "RefDenomination"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockEntry" ADD CONSTRAINT "StockEntry_saisiePar_fkey" FOREIGN KEY ("saisiePar") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportLog" ADD CONSTRAINT "ImportLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BriefHistory" ADD CONSTRAINT "BriefHistory_generePar_fkey" FOREIGN KEY ("generePar") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
