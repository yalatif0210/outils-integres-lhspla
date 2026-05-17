-- Add chargee_tresorerie to Role enum
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'chargee_tresorerie';

-- Create PaymentRequestStatus enum
DO $$ BEGIN
  CREATE TYPE "PaymentRequestStatus" AS ENUM ('uploaded', 'validated', 'paid');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- PaymentRequest table
CREATE TABLE IF NOT EXISTS "PaymentRequest" (
  "id"              TEXT NOT NULL,
  "budgetId"        TEXT NOT NULL,
  "entityCode"      TEXT NOT NULL,
  "status"          "PaymentRequestStatus" NOT NULL DEFAULT 'uploaded',
  "filePath"        TEXT NOT NULL,
  "fileName"        TEXT NOT NULL,
  "rejectionReason" TEXT,
  "uploadedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "uploadedById"    TEXT NOT NULL,
  "validatedAt"     TIMESTAMP(3),
  "validatedById"   TEXT,
  "paidAt"          TIMESTAMP(3),
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PaymentRequest_pkey" PRIMARY KEY ("id")
);

-- PaymentProof table
CREATE TABLE IF NOT EXISTS "PaymentProof" (
  "id"               TEXT NOT NULL,
  "paymentRequestId" TEXT NOT NULL,
  "filePath"         TEXT NOT NULL,
  "fileName"         TEXT NOT NULL,
  "fileType"         TEXT NOT NULL,
  "uploadedAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "uploadedById"     TEXT NOT NULL,
  CONSTRAINT "PaymentProof_pkey" PRIMARY KEY ("id")
);

-- PaymentTemplate table
CREATE TABLE IF NOT EXISTS "PaymentTemplate" (
  "id"           TEXT NOT NULL,
  "filePath"     TEXT NOT NULL,
  "fileName"     TEXT NOT NULL,
  "uploadedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "uploadedById" TEXT NOT NULL,
  CONSTRAINT "PaymentTemplate_pkey" PRIMARY KEY ("id")
);

-- Foreign keys PaymentRequest
ALTER TABLE "PaymentRequest"
  ADD CONSTRAINT "PaymentRequest_budgetId_fkey"
    FOREIGN KEY ("budgetId") REFERENCES "BudgetProject"("id") ON DELETE CASCADE,
  ADD CONSTRAINT "PaymentRequest_uploadedById_fkey"
    FOREIGN KEY ("uploadedById") REFERENCES "User"("id"),
  ADD CONSTRAINT "PaymentRequest_validatedById_fkey"
    FOREIGN KEY ("validatedById") REFERENCES "User"("id");

-- Foreign keys PaymentProof
ALTER TABLE "PaymentProof"
  ADD CONSTRAINT "PaymentProof_paymentRequestId_fkey"
    FOREIGN KEY ("paymentRequestId") REFERENCES "PaymentRequest"("id") ON DELETE CASCADE,
  ADD CONSTRAINT "PaymentProof_uploadedById_fkey"
    FOREIGN KEY ("uploadedById") REFERENCES "User"("id");

-- Foreign keys PaymentTemplate
ALTER TABLE "PaymentTemplate"
  ADD CONSTRAINT "PaymentTemplate_uploadedById_fkey"
    FOREIGN KEY ("uploadedById") REFERENCES "User"("id");

-- Indexes
CREATE INDEX IF NOT EXISTS "PaymentRequest_budgetId_idx" ON "PaymentRequest"("budgetId");
CREATE INDEX IF NOT EXISTS "PaymentRequest_entityCode_status_idx" ON "PaymentRequest"("entityCode", "status");
CREATE INDEX IF NOT EXISTS "PaymentProof_paymentRequestId_idx" ON "PaymentProof"("paymentRequestId");
