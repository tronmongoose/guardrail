-- AlterTable
ALTER TABLE "GenerationJob" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- CreateTable
CREATE TABLE "VideoAnalysis" (
    "id" TEXT NOT NULL,
    "youtubeVideoId" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "fullTranscript" TEXT,
    "segments" JSONB NOT NULL,
    "topics" JSONB NOT NULL,
    "keyMoments" JSONB,
    "people" JSONB,
    "durationSeconds" INTEGER,
    "model" TEXT NOT NULL DEFAULT 'gemini-2.5-flash-preview-05-20',
    "analyzedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VideoAnalysis_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "VideoAnalysis_youtubeVideoId_key" ON "VideoAnalysis"("youtubeVideoId");

-- AddForeignKey
ALTER TABLE "VideoAnalysis" ADD CONSTRAINT "VideoAnalysis_youtubeVideoId_fkey" FOREIGN KEY ("youtubeVideoId") REFERENCES "YouTubeVideo"("id") ON DELETE CASCADE ON UPDATE CASCADE;
