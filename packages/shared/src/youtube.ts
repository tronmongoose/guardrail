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

/**
 * Fetch YouTube video transcript/captions.
 * Uses the timedtext API endpoint (no API key required).
 * Returns null if no captions available.
 */
export async function fetchYouTubeTranscript(videoId: string): Promise<string | null> {
  try {
    // First, get the video page to extract caption track info
    const pageRes = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; GuideRail/1.0)",
      },
    });
    if (!pageRes.ok) return null;

    const html = await pageRes.text();

    // Extract captions URL from the page
    const captionMatch = html.match(/"captionTracks":\s*\[(.*?)\]/);
    if (!captionMatch) return null;

    // Parse the caption tracks JSON
    const tracksJson = `[${captionMatch[1]}]`;
    let tracks: Array<{ baseUrl: string; languageCode: string }>;
    try {
      tracks = JSON.parse(tracksJson);
    } catch {
      return null;
    }

    if (!tracks || tracks.length === 0) return null;

    // Prefer English, fall back to first available
    const englishTrack = tracks.find((t) => t.languageCode?.startsWith("en"));
    const track = englishTrack || tracks[0];

    if (!track?.baseUrl) return null;

    // Fetch the transcript XML
    const transcriptRes = await fetch(track.baseUrl);
    if (!transcriptRes.ok) return null;

    const xml = await transcriptRes.text();

    // Parse XML and extract text
    const textMatches = xml.matchAll(/<text[^>]*>(.*?)<\/text>/g);
    const lines: string[] = [];
    for (const match of textMatches) {
      // Decode HTML entities
      const text = match[1]
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/\n/g, " ")
        .trim();
      if (text) lines.push(text);
    }

    if (lines.length === 0) return null;

    // Join and truncate to reasonable length for storage
    // 30K chars covers most 20-30 min videos (~15K chars per 10 min of speech)
    const TRANSCRIPT_LIMIT = 30000;
    const fullTranscript = lines.join(" ");
    return fullTranscript.length > TRANSCRIPT_LIMIT
      ? fullTranscript.slice(0, TRANSCRIPT_LIMIT) + "..."
      : fullTranscript;
  } catch (err) {
    console.error("Failed to fetch transcript:", err);
    return null;
  }
}
