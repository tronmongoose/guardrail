-- CreateEnum
CREATE TYPE "ProgramTransitionMode" AS ENUM ('NONE', 'SIMPLE', 'BRANDED');

-- AlterTable
ALTER TABLE "Program" ADD COLUMN "transitionMode" "ProgramTransitionMode" NOT NULL DEFAULT 'NONE';

-- AlterTable
ALTER TABLE "Session" ADD COLUMN "hideTransition" BOOLEAN NOT NULL DEFAULT false;
