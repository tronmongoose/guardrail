-- Add Mux video fields for HLS transcoding and playback
ALTER TABLE "YouTubeVideo" ADD COLUMN "muxAssetId" TEXT;
ALTER TABLE "YouTubeVideo" ADD COLUMN "muxPlaybackId" TEXT;
