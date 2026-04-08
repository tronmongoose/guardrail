/**
 * Resolves the best available thumbnail URL for a video.
 * Priority: stored thumbnailUrl → Mux thumbnail API → null
 */
export function getVideoThumbnailUrl(
  video: {
    thumbnailUrl?: string | null;
    muxPlaybackId?: string | null;
  } | null | undefined
): string | null {
  if (!video) return null;
  if (video.thumbnailUrl) return video.thumbnailUrl;
  if (video.muxPlaybackId)
    return `https://image.mux.com/${video.muxPlaybackId}/thumbnail.jpg?time=2&width=320`;
  return null;
}
