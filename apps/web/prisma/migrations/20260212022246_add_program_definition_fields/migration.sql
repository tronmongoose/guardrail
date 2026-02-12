-- AlterTable
ALTER TABLE "Program" ADD COLUMN     "skinId" TEXT NOT NULL DEFAULT 'default',
ADD COLUMN     "targetAudience" TEXT,
ADD COLUMN     "targetTransformation" TEXT,
ADD COLUMN     "vibePrompt" TEXT;

-- AlterTable
ALTER TABLE "Session" ADD COLUMN     "keyTakeaways" TEXT[];
