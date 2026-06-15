-- AlterTable
ALTER TABLE "StockEntry" ADD COLUMN     "cmm" DECIMAL(10,2),
ADD COLUMN     "datePeremptionCentrale" TEXT,
ADD COLUMN     "datePeremptionPeripherie" TEXT,
ADD COLUMN     "stockCentrale" BIGINT,
ADD COLUMN     "stockNational" BIGINT;
