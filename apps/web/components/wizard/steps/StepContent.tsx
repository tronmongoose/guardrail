"use client";

import { useState } from "react";
import { parseYouTubeVideoId } from "@guide-rail/shared";

interface Video {
  id: string;
  videoId: string;
  title: string | null;
  thumbnailUrl: string | null;
}

interface Artifact {
  id?: string;
  originalFilename: string;
  fileType: string;
  extractedText: string;
  metadata: { pageCount?: number; wordCount: number };
}

interface StepContentProps {
  programId: string;
  videos: Video[];
  artifacts: Artifact[];
  onVideosChange: (videos: Video[]) => void;
  onArtifactsChange: (artifacts: Artifact[]) => void;
}

export function StepContent({
  programId,
  videos,
  artifacts,
  onVideosChange,
  onArtifactsChange,
}: StepContentProps) {
  const [videoUrl, setVideoUrl] = useState("");
  const [isAddingVideo, setIsAddingVideo] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionProgress, setExtractionProgress] = useState(0);

  const handleAddVideo = async () => {
    const videoId = parseYouTubeVideoId(videoUrl);
    if (!videoId) {
      alert("Invalid YouTube URL");
      return;
    }

    // Check for duplicates
    if (videos.some((v) => v.videoId === videoId)) {
      alert("Video already added");
      setVideoUrl("");
      return;
    }

    setIsAddingVideo(true);
    try {
      const res = await fetch(`/api/programs/${programId}/videos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: videoUrl }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to add video");
      }

      const video = await res.json();
      onVideosChange([...videos, video]);
      setVideoUrl("");
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to add video");
    } finally {
      setIsAddingVideo(false);
    }
  };

  const handleRemoveVideo = (videoId: string) => {
    onVideosChange(videos.filter((v) => v.id !== videoId));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileType = file.name.toLowerCase().endsWith(".pdf")
      ? "pdf"
      : file.name.toLowerCase().endsWith(".docx")
        ? "docx"
        : null;

    if (!fileType) {
      alert("Only PDF and DOCX files are supported");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert("File must be less than 10MB");
      return;
    }

    setIsExtracting(true);
    setExtractionProgress(0);

    try {
      let extractedText = "";
      let metadata: { pageCount?: number; wordCount: number } = { wordCount: 0 };

      if (fileType === "pdf") {
        // Dynamic import for PDF.js
        const pdfjsLib = await import("pdfjs-dist");
        pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

        const totalPages = pdf.numPages;
        const textParts: string[] = [];

        for (let i = 1; i <= totalPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          const pageText = textContent.items
            .map((item) => ("str" in item ? item.str : ""))
            .join(" ");
          textParts.push(pageText);
          setExtractionProgress((i / totalPages) * 100);
        }

        extractedText = textParts.join("\n\n");
        metadata = {
          pageCount: totalPages,
          wordCount: extractedText.split(/\s+/).length,
        };
      } else if (fileType === "docx") {
        // Dynamic import for mammoth
        const mammoth = await import("mammoth");
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        extractedText = result.value;
        metadata = {
          wordCount: extractedText.split(/\s+/).length,
        };
        setExtractionProgress(100);
      }

      // Add to artifacts (will be saved when wizard completes)
      onArtifactsChange([
        ...artifacts,
        {
          originalFilename: file.name,
          fileType,
          extractedText,
          metadata,
        },
      ]);
    } catch (error) {
      console.error("Extraction error:", error);
      alert("Failed to extract text from file");
    } finally {
      setIsExtracting(false);
      setExtractionProgress(0);
      // Reset file input
      e.target.value = "";
    }
  };

  const handleRemoveArtifact = (index: number) => {
    onArtifactsChange(artifacts.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-white mb-2">Program Content</h2>
        <p className="text-gray-400 text-sm">
          Add your video content and supporting documents. The AI will analyze these to create your program structure.
        </p>
      </div>

      {/* YouTube Videos */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          YouTube Videos
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            placeholder="Paste YouTube URL..."
            onKeyDown={(e) => e.key === "Enter" && handleAddVideo()}
            className="flex-1 px-4 py-2.5 bg-surface-dark border border-surface-border rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:border-neon-cyan focus:ring-1 focus:ring-neon-cyan"
          />
          <button
            onClick={handleAddVideo}
            disabled={isAddingVideo || !videoUrl}
            className="px-4 py-2.5 bg-neon-cyan/20 border border-neon-cyan text-neon-cyan rounded-lg hover:bg-neon-cyan/30 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isAddingVideo ? "Adding..." : "Add"}
          </button>
        </div>

        {/* Video list */}
        {videos.length > 0 && (
          <div className="mt-3 space-y-2">
            {videos.map((video) => (
              <div
                key={video.id}
                className="flex items-center gap-3 p-2 bg-surface-dark rounded-lg border border-surface-border"
              >
                {video.thumbnailUrl && (
                  <img
                    src={video.thumbnailUrl}
                    alt=""
                    className="w-16 h-9 object-cover rounded"
                  />
                )}
                <span className="flex-1 text-sm text-white truncate">
                  {video.title || video.videoId}
                </span>
                <button
                  onClick={() => handleRemoveVideo(video.id)}
                  className="p-1 text-gray-400 hover:text-neon-pink transition"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Supporting Documents */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Supporting Documents (Optional)
        </label>
        <p className="text-xs text-gray-500 mb-3">
          Upload PDFs or Word documents. Files are processed locally for privacy - only extracted text is saved.
        </p>

        {/* File dropzone */}
        <label className="block cursor-pointer">
          <div className={`
            border-2 border-dashed rounded-lg p-6 text-center transition
            ${isExtracting
              ? "border-neon-pink bg-neon-pink/5"
              : "border-surface-border hover:border-neon-cyan hover:bg-neon-cyan/5"
            }
          `}>
            {isExtracting ? (
              <div>
                <div className="w-8 h-8 mx-auto mb-2 border-2 border-neon-pink border-t-transparent rounded-full animate-spin" />
                <p className="text-sm text-neon-pink">Extracting text... {Math.round(extractionProgress)}%</p>
              </div>
            ) : (
              <>
                <svg className="w-8 h-8 mx-auto mb-2 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <p className="text-sm text-gray-400">
                  Drop PDF or DOCX files here, or <span className="text-neon-cyan">browse</span>
                </p>
                <p className="text-xs text-gray-500 mt-1">Max 10MB per file</p>
              </>
            )}
          </div>
          <input
            type="file"
            accept=".pdf,.docx"
            onChange={handleFileUpload}
            disabled={isExtracting}
            className="hidden"
          />
        </label>

        {/* Artifact list */}
        {artifacts.length > 0 && (
          <div className="mt-3 space-y-2">
            {artifacts.map((artifact, index) => (
              <div
                key={index}
                className="flex items-center gap-3 p-3 bg-surface-dark rounded-lg border border-surface-border"
              >
                <div className={`
                  w-10 h-10 rounded flex items-center justify-center text-xs font-medium
                  ${artifact.fileType === "pdf" ? "bg-red-500/20 text-red-400" : "bg-blue-500/20 text-blue-400"}
                `}>
                  {artifact.fileType.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">{artifact.originalFilename}</p>
                  <p className="text-xs text-gray-500">
                    {artifact.metadata.pageCount && `${artifact.metadata.pageCount} pages • `}
                    {artifact.metadata.wordCount.toLocaleString()} words
                  </p>
                </div>
                <button
                  onClick={() => handleRemoveArtifact(index)}
                  className="p-1 text-gray-400 hover:text-neon-pink transition"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Privacy notice */}
      <div className="flex items-start gap-2 p-3 bg-neon-cyan/5 border border-neon-cyan/20 rounded-lg">
        <svg className="w-5 h-5 text-neon-cyan flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        <div>
          <p className="text-sm text-neon-cyan font-medium">Privacy First</p>
          <p className="text-xs text-gray-400">
            Documents are processed entirely in your browser. Only the extracted text is saved - your original files never leave your device.
          </p>
        </div>
      </div>
    </div>
  );
}
