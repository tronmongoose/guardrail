-- Update programs with deleted legacy skin IDs to the new default
UPDATE "Program" SET "skinId" = 'classic-minimal' WHERE "skinId" IN ('default', 'professional', 'warm', 'minimal');

-- Update the column default to match the new skin catalog
ALTER TABLE "Program" ALTER COLUMN "skinId" SET DEFAULT 'classic-minimal';
