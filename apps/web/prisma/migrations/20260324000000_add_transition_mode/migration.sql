-- CreateEnum (idempotent — enum may already exist if a previous deploy partially ran)
DO $$ BEGIN
  CREATE TYPE "ProgramTransitionMode" AS ENUM ('NONE', 'SIMPLE', 'BRANDED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- AlterTable (idempotent)
ALTER TABLE "Program" ADD COLUMN IF NOT EXISTS "transitionMode" "ProgramTransitionMode" NOT NULL DEFAULT 'NONE';

-- AlterTable (idempotent)
ALTER TABLE "Session" ADD COLUMN IF NOT EXISTS "hideTransition" BOOLEAN NOT NULL DEFAULT false;
