"use client";

export interface ChapterClip {
  id: string;
  chapterTitle: string;
  chapterDescription?: string;
  thumbnailUrl?: string;
  durationSeconds?: number;
}

export interface ChapterRailProps {
  clips: ChapterClip[];
  currentIndex: number;
  onJump: (index: number) => void;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function ChapterRail({ clips, currentIndex, onJump }: ChapterRailProps) {
  if (clips.length <= 1) return null;

  return (
    <>
      {/* Desktop: vertical sidebar */}
      <aside
        className="hidden md:flex flex-col gap-1 overflow-y-auto p-3"
        style={{
          backgroundColor: "var(--token-comp-viewer-rail-bg)",
          borderLeft: "1px solid var(--token-comp-viewer-rail-divider)",
          maxHeight: "100%",
        }}
        role="tablist"
        aria-label="Video chapters"
      >
        {clips.map((clip, i) => (
          <button
            key={clip.id}
            onClick={() => onJump(i)}
            role="tab"
            aria-selected={i === currentIndex}
            aria-label={`Chapter ${i + 1}: ${clip.chapterTitle}`}
            className="flex items-start gap-2.5 rounded-lg px-3 py-2.5 text-left transition-colors"
            style={{
              backgroundColor:
                i === currentIndex
                  ? "var(--token-comp-viewer-rail-active)"
                  : "transparent",
            }}
          >
            <span
              className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded text-[10px] font-bold"
              style={{
                backgroundColor:
                  i === currentIndex
                    ? "var(--token-color-accent)"
                    : "var(--token-comp-viewer-rail-active)",
                color:
                  i === currentIndex
                    ? "var(--token-comp-viewer-overlay-text)"
                    : "var(--token-color-text-secondary)",
              }}
            >
              {i + 1}
            </span>
            <div className="min-w-0 flex-1">
              <p
                className="truncate text-xs font-medium"
                style={{
                  color:
                    i === currentIndex
                      ? "var(--token-color-text-primary)"
                      : "var(--token-color-text-secondary)",
                }}
              >
                {clip.chapterTitle}
              </p>
              {clip.durationSeconds != null && (
                <span
                  className="text-[10px]"
                  style={{ color: "var(--token-color-text-secondary)" }}
                >
                  {formatDuration(clip.durationSeconds)}
                </span>
              )}
            </div>
          </button>
        ))}
      </aside>

      {/* Mobile: horizontal pill strip */}
      <div
        className="flex md:hidden gap-1.5 overflow-x-auto px-4 py-2 scrollbar-none"
        style={{
          backgroundColor: "var(--token-comp-viewer-rail-bg)",
          borderBottom: "1px solid var(--token-comp-viewer-rail-divider)",
        }}
        role="tablist"
        aria-label="Video chapters"
      >
        {clips.map((clip, i) => (
          <button
            key={clip.id}
            onClick={() => onJump(i)}
            role="tab"
            aria-selected={i === currentIndex}
            aria-label={`Chapter ${i + 1}: ${clip.chapterTitle}`}
            className="flex-shrink-0 rounded-full px-3 py-1.5 text-[11px] font-medium transition-colors whitespace-nowrap"
            style={{
              backgroundColor:
                i === currentIndex
                  ? "var(--token-color-accent)"
                  : "var(--token-comp-viewer-rail-active)",
              color:
                i === currentIndex
                  ? "var(--token-comp-viewer-overlay-text)"
                  : "var(--token-color-text-secondary)",
            }}
          >
            {clip.chapterTitle}
          </button>
        ))}
      </div>
    </>
  );
}
