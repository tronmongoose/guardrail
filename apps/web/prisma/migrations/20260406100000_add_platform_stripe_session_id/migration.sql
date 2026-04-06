-- AlterTable
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "platformStripeSessionId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "User_platformStripeSessionId_key" ON "User"("platformStripeSessionId");
