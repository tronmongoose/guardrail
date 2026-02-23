-- CreateEnum
CREATE TYPE "TransitionType" AS ENUM ('NONE', 'FADE', 'CROSSFADE', 'SLIDE_LEFT');

-- CreateEnum
CREATE TYPE "OverlayType" AS ENUM ('TITLE_CARD', 'CHAPTER_TITLE', 'KEY_POINTS', 'LOWER_THIRD', 'CTA', 'OUTRO');

-- CreateEnum
CREATE TYPE "OverlayPosition" AS ENUM ('CENTER', 'BOTTOM', 'TOP', 'LOWER_THIRD');

-- CreateTable
CREATE TABLE "CompositeSession" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "thumbnailUrl" TEXT,
    "autoAdvance" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompositeSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SessionClip" (
    "id" TEXT NOT NULL,
    "compositeSessionId" TEXT NOT NULL,
    "youtubeVideoId" TEXT NOT NULL,
    "startSeconds" DOUBLE PRECISION,
    "endSeconds" DOUBLE PRECISION,
    "orderIndex" INTEGER NOT NULL,
    "transitionType" "TransitionType" NOT NULL DEFAULT 'NONE',
    "transitionDurationMs" INTEGER NOT NULL DEFAULT 500,
    "chapterTitle" TEXT,
    "chapterDescription" TEXT,

    CONSTRAINT "SessionClip_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SessionOverlay" (
    "id" TEXT NOT NULL,
    "compositeSessionId" TEXT NOT NULL,
    "type" "OverlayType" NOT NULL,
    "content" JSONB NOT NULL,
    "clipOrderIndex" INTEGER,
    "triggerAtSeconds" DOUBLE PRECISION,
    "durationMs" INTEGER NOT NULL DEFAULT 5000,
    "position" "OverlayPosition" NOT NULL DEFAULT 'CENTER',
    "orderIndex" INTEGER NOT NULL,

    CONSTRAINT "SessionOverlay_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CompositeSession_sessionId_key" ON "CompositeSession"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "SessionClip_compositeSessionId_orderIndex_key" ON "SessionClip"("compositeSessionId", "orderIndex");

-- AddForeignKey
ALTER TABLE "CompositeSession" ADD CONSTRAINT "CompositeSession_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionClip" ADD CONSTRAINT "SessionClip_compositeSessionId_fkey" FOREIGN KEY ("compositeSessionId") REFERENCES "CompositeSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionClip" ADD CONSTRAINT "SessionClip_youtubeVideoId_fkey" FOREIGN KEY ("youtubeVideoId") REFERENCES "YouTubeVideo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionOverlay" ADD CONSTRAINT "SessionOverlay_compositeSessionId_fkey" FOREIGN KEY ("compositeSessionId") REFERENCES "CompositeSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
