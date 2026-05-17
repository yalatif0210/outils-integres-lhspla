-- Create PaymentAuditAction enum
DO $$ BEGIN
  CREATE TYPE "PaymentAuditAction" AS ENUM ('request_deleted', 'proof_deleted');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- PaymentAuditLog table
CREATE TABLE IF NOT EXISTS "PaymentAuditLog" (
  "id"               TEXT NOT NULL,
  "paymentRequestId" TEXT,
  "proofId"          TEXT,
  "budgetId"         TEXT NOT NULL,
  "userId"           TEXT NOT NULL,
  "action"           "PaymentAuditAction" NOT NULL,
  "detail"           TEXT NOT NULL DEFAULT '',
  "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PaymentAuditLog_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "PaymentAuditLog"
  ADD CONSTRAINT "PaymentAuditLog_paymentRequestId_fkey"
    FOREIGN KEY ("paymentRequestId") REFERENCES "PaymentRequest"("id") ON DELETE SET NULL,
  ADD CONSTRAINT "PaymentAuditLog_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id");

CREATE INDEX IF NOT EXISTS "PaymentAuditLog_paymentRequestId_idx" ON "PaymentAuditLog"("paymentRequestId");
CREATE INDEX IF NOT EXISTS "PaymentAuditLog_budgetId_idx" ON "PaymentAuditLog"("budgetId");
