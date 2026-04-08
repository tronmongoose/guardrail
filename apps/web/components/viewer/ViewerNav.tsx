"use client";

import Link from "next/link";

export interface ViewerNavProps {
  programId: string;
  programTitle?: string;
  sessionTitle: string;
  currentClip: number;
  totalClips: number;
}

export function ViewerNav({
  programId,
  programTitle,
  sessionTitle,
  currentClip,
  totalClips,
}: ViewerNavProps) {
  return (
    <nav
      className="sticky top-0 z-30 flex items-center gap-3 px-4 py-3 backdrop-blur-xl"
      style={{
        backgroundColor: "color-mix(in srgb, var(--token-color-bg-default) 90%, transparent)",
        borderBottom: "1px solid var(--token-color-border-subtle)",
      }}
    >
      <Link
        href={`/learn/${programId}`}
        className="flex items-center gap-1.5 text-sm font-medium transition-colors hover:opacity-80"
        style={{ color: "var(--token-color-accent)" }}
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back
      </Link>

      <div className="mx-2 h-4 w-px" style={{ backgroundColor: "var(--token-color-border-subtle)" }} />

      {/* Desktop: breadcrumb with program title */}
      <div className="hidden md:flex flex-1 items-center gap-1.5 min-w-0">
        {programTitle && (
          <>
            <span
              className="text-xs truncate max-w-[200px] flex-shrink"
              style={{ color: "var(--token-color-text-secondary)" }}
            >
              {programTitle}
            </span>
            <span
              className="text-xs flex-shrink-0"
              style={{ color: "var(--token-color-text-secondary)", opacity: 0.5 }}
            >
              /
            </span>
          </>
        )}
        <p
          className="truncate text-sm font-medium"
          style={{ color: "var(--token-color-text-primary)" }}
        >
          {sessionTitle}
        </p>
      </div>

      {/* Mobile: session title only */}
      <p
        className="flex-1 truncate text-sm font-medium md:hidden"
        style={{ color: "var(--token-color-text-primary)" }}
      >
        {sessionTitle}
      </p>

      {totalClips > 1 && (
        <span
          className="flex-shrink-0 text-xs font-medium px-2 py-0.5 rounded-full"
          style={{
            backgroundColor: "var(--token-comp-viewer-rail-active)",
            color: "var(--token-color-text-secondary)",
          }}
        >
          {currentClip + 1} / {totalClips}
        </span>
      )}
    </nav>
  );
}
