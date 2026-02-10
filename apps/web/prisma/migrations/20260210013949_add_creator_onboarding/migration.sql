-- AlterTable
ALTER TABLE "Program" ADD COLUMN     "outcomeStatement" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "bio" TEXT,
ADD COLUMN     "niche" TEXT,
ADD COLUMN     "onboardingComplete" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "outcomeTarget" TEXT;
