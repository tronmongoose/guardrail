"use client";

import { useState, useRef, useCallback } from "react";
import { Spinner } from "@/components/ui/spinner";

interface CreatorAvatarUploadProps {
  programId: string;
  avatarUrl: string | null;
  onUploaded: (url: string | null) => void;
}

export function CreatorAvatarUpload({ programId, avatarUrl, onUploaded }: CreatorAvatarUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const upload = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("Please upload an image file (JPG, PNG, WebP)");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be under 5 MB");
      return;
    }

    setError(null);
    setUploading(true);

    try {
      const res = await fetch(
        `/api/programs/${programId}/avatar?filename=${encodeURIComponent(file.name)}`,
        {
          method: "PUT",
          headers: { "Content-Type": file.type },
          body: file,
        }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Upload failed");
      }
      const { url } = await res.json();
      onUploaded(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }, [programId, onUploaded]);

  const handleRemove = useCallback(async () => {
    setUploading(true);
    setError(null);
    try {
      await fetch(`/api/programs/${programId}/avatar`, { method: "DELETE" });
      onUploaded(null);
    } catch {
      setError("Failed to remove avatar");
    } finally {
      setUploading(false);
    }
  }, [programId, onUploaded]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) upload(file);
  }, [upload]);

  return (
    <div className="space-y-3">
      <label className="block text-xs text-gray-400 mb-1">Creator Avatar</label>

      {avatarUrl ? (
        /* ── Has avatar ─────────────────────────────────── */
        <div className="flex items-center gap-4">
          <div className="relative group">
            {/* Avatar ring with gradient border */}
            <div className="w-28 h-28 rounded-full p-[2px] bg-gradient-to-br from-teal-400 via-pink-500 to-purple-500">
              <div className="w-full h-full rounded-full overflow-hidden bg-gray-900">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={avatarUrl}
                  alt="Creator avatar"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
            {/* Hover overlay */}
            <div
              className="absolute inset-0 rounded-full bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="text-xs text-teal-400 hover:text-teal-300 transition font-medium"
            >
              Change photo
            </button>
            <button
              type="button"
              onClick={handleRemove}
              disabled={uploading}
              className="text-xs text-gray-500 hover:text-red-400 transition"
            >
              {uploading ? "Removing..." : "Remove"}
            </button>
          </div>
        </div>
      ) : (
        /* ── Empty state / drop zone ────────────────────── */
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => !uploading && fileInputRef.current?.click()}
          className={`
            relative flex items-center gap-4 px-4 py-4 rounded-xl border-2 border-dashed cursor-pointer
            transition-all duration-200
            ${dragOver
              ? "border-teal-400 bg-teal-900/20"
              : "border-gray-700 hover:border-gray-500 bg-gray-900/50 hover:bg-gray-900"
            }
          `}
        >
          {uploading ? (
            <div className="flex items-center gap-3">
              <Spinner size="sm" />
              <span className="text-sm text-gray-400">Uploading...</span>
            </div>
          ) : (
            <>
              {/* Placeholder avatar circle */}
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-gray-800 to-gray-700 border border-gray-600 flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-gray-300 font-medium">
                  Add your profile photo
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Drag & drop or click to upload · JPG, PNG, WebP · Max 5 MB
                </p>
              </div>
            </>
          )}
        </div>
      )}

      {error && <p className="text-xs text-red-400">{error}</p>}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) upload(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}
