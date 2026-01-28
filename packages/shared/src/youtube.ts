/**
 * Extract YouTube video ID from various URL formats.
 */
export function parseYouTubeVideoId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname === "youtu.be") {
      return u.pathname.slice(1) || null;
    }
    if (
      u.hostname === "www.youtube.com" ||
      u.hostname === "youtube.com" ||
      u.hostname === "m.youtube.com"
    ) {
      return u.searchParams.get("v") || null;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Fetch YouTube oEmbed metadata (no API key required).
 */
export async function fetchYouTubeOEmbed(videoId: string) {
  const url = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`YouTube oEmbed failed: ${res.status}`);
  const data = await res.json();
  return {
    title: data.title as string,
    authorName: data.author_name as string,
    thumbnailUrl: data.thumbnail_url as string,
  };
}
