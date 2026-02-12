-- CreateEnum
CREATE TYPE "ProgramStatus" AS ENUM ('DRAFT', 'PUBLISHED');

-- CreateEnum
CREATE TYPE "DurationPreset" AS ENUM ('SIX_WEEKS', 'EIGHT_WEEKS', 'TWELVE_WEEKS');

-- AlterTable
ALTER TABLE "Program" ADD COLUMN     "status" "ProgramStatus" NOT NULL DEFAULT 'DRAFT';

-- AlterTable
ALTER TABLE "YouTubeVideo" ADD COLUMN     "durationSeconds" INTEGER;
