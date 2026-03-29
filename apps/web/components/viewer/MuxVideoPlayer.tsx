"use client";

import MuxPlayer from "@mux/mux-player-react";

interface MuxVideoPlayerProps {
  playbackId: string;
  title?: string;
  className?: string;
}

export function MuxVideoPlayer({
  playbackId,
  title,
  className = "",
}: MuxVideoPlayerProps) {
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
        playbackId={playbackId}
        streamType="on-demand"
        metadata={{ video_title: title }}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        style={
          {
            "--media-primary-color": "var(--token-color-primary, #6366f1)",
            "--media-secondary-color": "var(--token-color-bg-default, #111827)",
            height: "100%",
            width: "100%",
          } as any
        }
      />
    </div>
  );
}
