"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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
  /** Start playback automatically once the stream is ready and seeked. */
  autoPlay?: boolean;
  /** Called when the clip reaches endSeconds or the video ends naturally. */
  onClipEnd?: () => void;
}

// Max retry attempts for the imperative seek. Prevents an infinite loop if
// startSeconds lies outside the asset's actual seekable range.
const MAX_SEEK_ATTEMPTS = 5;
// Tolerance (seconds) for considering a seek to have landed at startSeconds.
const SEEK_TOLERANCE = 0.5;

export function MuxVideoPlayer({
  playbackId,
  tokens,
  title,
  className = "",
  startSeconds,
  endSeconds,
  autoPlay,
  onClipEnd,
}: MuxVideoPlayerProps) {
  // Ref-callback pattern: `next/dynamic` wraps the component in `React.lazy`,
  // which does not transparently forward refs. Using a state-backed callback
  // ref gives us the real <mux-player> element (an HTMLMediaElement) once it
  // attaches, and re-runs the listener effect when it swaps on remount.
  const [playerEl, setPlayerEl] = useState<HTMLMediaElement | null>(null);

  const clipEndFiredRef = useRef(false);
  const seekVerifiedRef = useRef(false);
  const seekAttemptsRef = useRef(0);

  useEffect(() => {
    clipEndFiredRef.current = false;
    seekVerifiedRef.current = false;
    seekAttemptsRef.current = 0;
  }, [playbackId, startSeconds, endSeconds]);

  const attemptSeek = useCallback(() => {
    if (seekVerifiedRef.current || !playerEl) return;
    if (startSeconds == null || startSeconds <= 0) {
      seekVerifiedRef.current = true;
      return;
    }
    if (seekAttemptsRef.current >= MAX_SEEK_ATTEMPTS) return;
    // HLS streams don't expose a usable seekable range until manifest + init
    // segments have loaded. Guard so we don't silently no-op and burn our
    // retry budget on an un-seekable state.
    const seekable = playerEl.seekable;
    if (!seekable || seekable.length === 0) return;
    if (seekable.end(seekable.length - 1) < startSeconds) return;
    seekAttemptsRef.current += 1;
    playerEl.currentTime = startSeconds;
    // Verification happens in the `seeked` handler below.
  }, [playerEl, startSeconds]);

  useEffect(() => {
    if (!playerEl) return;

    const handleTimeUpdate = () => {
      if (endSeconds == null || clipEndFiredRef.current) return;
      if (playerEl.currentTime >= endSeconds) {
        clipEndFiredRef.current = true;
        if (typeof playerEl.pause === "function") playerEl.pause();
        onClipEnd?.();
      }
    };

    const handleLoadedMetadata = () => attemptSeek();
    const handleLoadedData = () => attemptSeek();

    const handleCanPlay = () => {
      attemptSeek();
      if (autoPlay && seekVerifiedRef.current) {
        playerEl.play().catch(() => {
          // Browser autoplay policy may still reject; user sees native play
          // button and can click through.
        });
      }
    };

    const handleSeeked = () => {
      if (startSeconds == null) {
        seekVerifiedRef.current = true;
        return;
      }
      if (Math.abs(playerEl.currentTime - startSeconds) < SEEK_TOLERANCE) {
        seekVerifiedRef.current = true;
        if (autoPlay) {
          playerEl.play().catch(() => {});
        }
      } else if (seekAttemptsRef.current < MAX_SEEK_ATTEMPTS) {
        attemptSeek();
      }
    };

    const handleEnded = () => {
      if (clipEndFiredRef.current) return;
      clipEndFiredRef.current = true;
      onClipEnd?.();
    };

    playerEl.addEventListener("timeupdate", handleTimeUpdate);
    playerEl.addEventListener("loadedmetadata", handleLoadedMetadata);
    playerEl.addEventListener("loadeddata", handleLoadedData);
    playerEl.addEventListener("canplay", handleCanPlay);
    playerEl.addEventListener("seeked", handleSeeked);
    playerEl.addEventListener("ended", handleEnded);

    return () => {
      playerEl.removeEventListener("timeupdate", handleTimeUpdate);
      playerEl.removeEventListener("loadedmetadata", handleLoadedMetadata);
      playerEl.removeEventListener("loadeddata", handleLoadedData);
      playerEl.removeEventListener("canplay", handleCanPlay);
      playerEl.removeEventListener("seeked", handleSeeked);
      playerEl.removeEventListener("ended", handleEnded);
    };
  }, [playerEl, startSeconds, endSeconds, autoPlay, attemptSeek, onClipEnd]);

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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ref={setPlayerEl as any}
        playbackId={playbackId}
        tokens={tokens}
        streamType="on-demand"
        metadata={{ video_title: title }}
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
