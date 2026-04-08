"use client";

import { useRef, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";

const MuxPlayer = dynamic(() => import("@mux/mux-player-react"), {
  ssr: false,
  loading: () => (
    <div className="aspect-video w-full bg-black animate-pulse" />
  ),
});

interface MuxVideoPlayerProps {
  playbackId: string;
  /** JWT signed tokens for protected playback IDs (policy: "signed"). */
  tokens?: { playback: string };
  title?: string;
  className?: string;
  /** Seek to this time on load (seconds). */
  startSeconds?: number;
  /** Pause/fire onClipEnd when playback reaches this time (seconds). */
  endSeconds?: number;
  /** Called when the clip reaches endSeconds or the video ends naturally. */
  onClipEnd?: () => void;
}

export function MuxVideoPlayer({
  playbackId,
  tokens,
  title,
  className = "",
  startSeconds,
  endSeconds,
  onClipEnd,
}: MuxVideoPlayerProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const playerRef = useRef<any>(null);
  const clipEndFiredRef = useRef(false);

  // Reset the "fired" flag when clip boundaries change
  useEffect(() => {
    clipEndFiredRef.current = false;
  }, [playbackId, startSeconds, endSeconds]);

  const handleTimeUpdate = useCallback(() => {
    if (!endSeconds || clipEndFiredRef.current) return;
    const el = playerRef.current;
    if (!el) return;
    const currentTime = typeof el.currentTime === "number" ? el.currentTime : 0;
    if (currentTime >= endSeconds) {
      clipEndFiredRef.current = true;
      if (typeof el.pause === "function") el.pause();
      onClipEnd?.();
    }
  }, [endSeconds, onClipEnd]);

  const handleEnded = useCallback(() => {
    if (clipEndFiredRef.current) return;
    clipEndFiredRef.current = true;
    onClipEnd?.();
  }, [onClipEnd]);

  return (
    <div
      className={`aspect-video w-full overflow-hidden ${className}`}
      style={{
        borderRadius: "var(--token-comp-video-radius)",
        border: "var(--token-comp-video-border)",
        boxShadow: "var(--token-shadow-md)",
      }}
    >
      <MuxPlayer
        ref={playerRef}
        playbackId={playbackId}
        tokens={tokens}
        streamType="on-demand"
        startTime={startSeconds}
        metadata={{ video_title: title }}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        style={
          {
            "--media-primary-color": "var(--token-color-accent, #6366f1)",
            "--media-secondary-color": "var(--token-color-bg-default, #111827)",
            height: "100%",
            width: "100%",
          } as any
        }
      />
    </div>
  );
}
