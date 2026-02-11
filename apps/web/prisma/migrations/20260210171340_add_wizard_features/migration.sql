-- AlterTable
ALTER TABLE "Program" ADD COLUMN     "styleInfluencers" TEXT[];

-- CreateTable
CREATE TABLE "Influencer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "platformHandle" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "niche" TEXT,
    "styleProfile" JSONB,
    "sampleVideoIds" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Influencer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserInfluencer" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "influencerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserInfluencer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProgramArtifact" (
    "id" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "originalFilename" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "extractedText" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProgramArtifact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProgramRating" (
    "id" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "uniquenessScore" DOUBLE PRECISION,
    "completenessScore" DOUBLE PRECISION,
    "evaluatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProgramRating_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Influencer_platform_platformHandle_key" ON "Influencer"("platform", "platformHandle");

-- CreateIndex
CREATE UNIQUE INDEX "UserInfluencer_userId_influencerId_key" ON "UserInfluencer"("userId", "influencerId");

-- CreateIndex
CREATE UNIQUE INDEX "ProgramRating_programId_key" ON "ProgramRating"("programId");

-- AddForeignKey
ALTER TABLE "UserInfluencer" ADD CONSTRAINT "UserInfluencer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserInfluencer" ADD CONSTRAINT "UserInfluencer_influencerId_fkey" FOREIGN KEY ("influencerId") REFERENCES "Influencer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgramArtifact" ADD CONSTRAINT "ProgramArtifact_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgramRating" ADD CONSTRAINT "ProgramRating_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program"("id") ON DELETE CASCADE ON UPDATE CASCADE;
