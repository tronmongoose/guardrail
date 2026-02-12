-- Add Stripe Connect fields to User
ALTER TABLE "User" ADD COLUMN "stripeAccountId" TEXT;
ALTER TABLE "User" ADD COLUMN "stripeAccountStatus" TEXT;
ALTER TABLE "User" ADD COLUMN "stripeOnboardingComplete" BOOLEAN NOT NULL DEFAULT false;

-- Make clerkId optional (for learners who only use magic links)
ALTER TABLE "User" ALTER COLUMN "clerkId" DROP NOT NULL;

-- Add unique constraint for stripeAccountId
CREATE UNIQUE INDEX "User_stripeAccountId_key" ON "User"("stripeAccountId");

-- Add currentWeek to Entitlement for tracking unlocked week
ALTER TABLE "Entitlement" ADD COLUMN "currentWeek" INTEGER NOT NULL DEFAULT 1;

-- Create MagicLink table for learner authentication
CREATE TABLE "MagicLink" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "programId" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MagicLink_pkey" PRIMARY KEY ("id")
);

-- Create unique index on token
CREATE UNIQUE INDEX "MagicLink_token_key" ON "MagicLink"("token");

-- Create index for faster lookups
CREATE INDEX "MagicLink_token_idx" ON "MagicLink"("token");
CREATE INDEX "MagicLink_userId_idx" ON "MagicLink"("userId");

-- Add foreign key constraint
ALTER TABLE "MagicLink" ADD CONSTRAINT "MagicLink_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Create WeekCompletion table for tracking completed weeks
CREATE TABLE "WeekCompletion" (
    "id" TEXT NOT NULL,
    "entitlementId" TEXT NOT NULL,
    "weekNumber" INTEGER NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WeekCompletion_pkey" PRIMARY KEY ("id")
);

-- Create unique index for entitlement-week combination
CREATE UNIQUE INDEX "WeekCompletion_entitlementId_weekNumber_key" ON "WeekCompletion"("entitlementId", "weekNumber");

-- Add foreign key constraint
ALTER TABLE "WeekCompletion" ADD CONSTRAINT "WeekCompletion_entitlementId_fkey" FOREIGN KEY ("entitlementId") REFERENCES "Entitlement"("id") ON DELETE CASCADE ON UPDATE CASCADE;
