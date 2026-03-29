"use client";

import { useRef, useState } from "react";

interface MuxUploaderProps {
  actionId?: string;
  onUploadComplete?: (uploadId: string) => void;
  onError?: (error: string) => void;
}

type UploadState = "idle" | "uploading" | "done" | "error";

export function MuxUploader({
  actionId,
  onUploadComplete,
  onError,
}: MuxUploaderProps) {
  const [state, setState] = useState<UploadState>("idle");
  const [progress, setProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const xhrRef = useRef<XMLHttpRequest | null>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setState("uploading");
    setProgress(0);
    setErrorMessage(null);

    try {
      // Step 1: Get a Mux direct upload URL
      const res = await fetch("/api/mux/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actionId }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to get upload URL");
      }

      const { uploadId, uploadUrl } = (await res.json()) as {
        uploadId: string;
        uploadUrl: string;
      };

      // Step 2: PUT the file directly to Mux (never touches the Next.js server)
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhrRef.current = xhr;

        xhr.upload.addEventListener("progress", (event) => {
          if (event.lengthComputable) {
            setProgress(Math.round((event.loaded / event.total) * 100));
          }
        });

        xhr.addEventListener("load", () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            reject(new Error(`Upload failed with status ${xhr.status}`));
          }
        });

        xhr.addEventListener("error", () =>
          reject(new Error("Network error during upload"))
        );
        xhr.addEventListener("abort", () =>
          reject(new Error("Upload cancelled"))
        );

        xhr.open("PUT", uploadUrl);
        xhr.setRequestHeader("Content-Type", file.type || "video/mp4");
        xhr.send(file);
      });

      setState("done");
      setProgress(100);
      onUploadComplete?.(uploadId);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Upload failed";
      setState("error");
      setErrorMessage(msg);
      onError?.(msg);
    } finally {
      xhrRef.current = null;
      // Reset the input so the same file can be re-selected if needed
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {state === "idle" && (
        <label
          className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-6 py-8 text-sm transition-colors hover:border-opacity-80"
          style={{
            borderColor: "var(--token-color-primary, #6366f1)",
            color: "var(--token-color-text-muted, #9ca3af)",
            borderRadius: "var(--token-radius-card, 0.75rem)",
          }}
        >
          <svg
            className="h-8 w-8 opacity-60"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
            />
          </svg>
          <span>Click to upload video</span>
          <span className="text-xs opacity-60">MP4, MOV, WebM up to 5 GB</span>
          <input
            ref={inputRef}
            type="file"
            accept="video/mp4,video/quicktime,video/webm,video/x-matroska,video/mpeg,video/x-msvideo"
            multiple={false}
            className="sr-only"
            onChange={handleFileChange}
          />
        </label>
      )}

      {state === "uploading" && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between text-sm">
            <span style={{ color: "var(--token-color-text-muted, #9ca3af)" }}>
              Uploading to Mux…
            </span>
            <span
              className="font-medium tabular-nums"
              style={{ color: "var(--token-color-primary, #6366f1)" }}
            >
              {progress}%
            </span>
          </div>
          <div
            className="h-2 w-full overflow-hidden rounded-full"
            style={{ backgroundColor: "var(--token-color-surface, #1f2937)" }}
          >
            <div
              className="h-full rounded-full transition-all duration-200"
              style={{
                width: `${progress}%`,
                backgroundColor: "var(--token-color-primary, #6366f1)",
              }}
            />
          </div>
        </div>
      )}

      {state === "done" && (
        <div
          className="flex items-center gap-2 rounded-lg px-4 py-3 text-sm"
          style={{
            backgroundColor: "var(--token-color-surface, #1f2937)",
            color: "var(--token-color-text-muted, #9ca3af)",
            borderRadius: "var(--token-radius-card, 0.75rem)",
          }}
        >
          <svg
            className="h-4 w-4 shrink-0 text-green-500"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
              clipRule="evenodd"
            />
          </svg>
          <span>Upload complete — video is processing.</span>
        </div>
      )}

      {state === "error" && (
        <div className="flex flex-col gap-2">
          <div
            className="flex items-center gap-2 rounded-lg border px-4 py-3 text-sm"
            style={{
              borderColor: "var(--token-color-error, #ef4444)",
              color: "var(--token-color-error, #ef4444)",
              borderRadius: "var(--token-radius-card, 0.75rem)",
            }}
          >
            <svg
              className="h-4 w-4 shrink-0"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z"
                clipRule="evenodd"
              />
            </svg>
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={() => setState("idle")}
            className="self-start text-xs underline opacity-60 hover:opacity-100"
          >
            Try again
          </button>
        </div>
      )}
    </div>
  );
}
