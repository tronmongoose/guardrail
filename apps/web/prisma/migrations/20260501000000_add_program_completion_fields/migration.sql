-- AlterTable
ALTER TABLE "Entitlement" ADD COLUMN IF NOT EXISTS "programCompletedAt" TIMESTAMP(3);
ALTER TABLE "Entitlement" ADD COLUMN IF NOT EXISTS "completionEmailSentAt" TIMESTAMP(3);
