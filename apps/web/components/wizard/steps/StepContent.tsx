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
  extractedText?: string;
  metadata: { pageCount?: number; wordCount: number };
}

interface StepContentProps {
  programId: string;
  videos: Video[];
  artifacts: Artifact[];
  onVideosChange: (videos: Video[]) => void;
  onArtifactsChange: (artifacts: Artifact[]) => void;
}

type ContentTab = "youtube" | "upload";

interface FileExtractionState {
  filename: string;
  progress: number;
  status: "extracting" | "done" | "error";
  error?: string;
}

const ACCEPTED_FILE_TYPES = ".pdf,.docx,.txt,.md";

function getFileType(filename: string): string | null {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".pdf")) return "pdf";
  if (lower.endsWith(".docx")) return "docx";
  if (lower.endsWith(".txt")) return "txt";
  if (lower.endsWith(".md")) return "md";
  return null;
}

function getFileTypeColor(fileType: string): string {
  switch (fileType) {
    case "pdf": return "bg-red-500/20 text-red-400";
    case "docx": return "bg-blue-500/20 text-blue-400";
    case "txt": return "bg-green-500/20 text-green-400";
    case "md": return "bg-purple-500/20 text-purple-400";
    default: return "bg-gray-500/20 text-gray-400";
  }
}

export function StepContent({
  programId,
  videos,
  artifacts,
  onVideosChange,
  onArtifactsChange,
}: StepContentProps) {
  const [activeTab, setActiveTab] = useState<ContentTab>(
    videos.length > 0 ? "youtube" : artifacts.length > 0 ? "upload" : "youtube"
  );
  const [videoUrl, setVideoUrl] = useState("");
  const [isAddingVideo, setIsAddingVideo] = useState(false);
  const [extractionStates, setExtractionStates] = useState<FileExtractionState[]>([]);

  // Batch mode state
  const [showBatchMode, setShowBatchMode] = useState(false);
  const [batchUrls, setBatchUrls] = useState("");
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0, errors: [] as string[] });

  const isExtracting = extractionStates.some((s) => s.status === "extracting");

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

  const handleBatchAdd = async () => {
    const urls = batchUrls
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    if (urls.length === 0) {
      alert("Please enter at least one URL");
      return;
    }

    if (urls.length > 20) {
      alert("Maximum 20 videos at a time");
      return;
    }

    setIsBatchProcessing(true);
    setBatchProgress({ current: 0, total: urls.length, errors: [] });

    try {
      const res = await fetch(`/api/programs/${programId}/videos/batch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urls }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Batch upload failed");
      }

      const result = await res.json();

      // Add successful videos
      if (result.success.length > 0) {
        onVideosChange([...videos, ...result.success]);
      }

      // Report errors
      if (result.errors.length > 0) {
        setBatchProgress((prev) => ({
          ...prev,
          current: urls.length,
          errors: result.errors.map((e: { url: string; error: string }) => `${e.url}: ${e.error}`),
        }));
      } else {
        setBatchUrls("");
        setShowBatchMode(false);
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : "Batch upload failed");
    } finally {
      setIsBatchProcessing(false);
    }
  };

  const extractSingleFile = async (file: File): Promise<Artifact | null> => {
    const fileType = getFileType(file.name);
    if (!fileType) {
      return null;
    }

    if (file.size > 10 * 1024 * 1024) {
      throw new Error(`${file.name}: File must be less than 10MB`);
    }

    const updateProgress = (filename: string, progress: number) => {
      setExtractionStates((prev) =>
        prev.map((s) => s.filename === filename ? { ...s, progress } : s)
      );
    };

    let extractedText = "";
    let metadata: { pageCount?: number; wordCount: number } = { wordCount: 0 };

    if (fileType === "pdf") {
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
        updateProgress(file.name, (i / totalPages) * 100);
      }

      extractedText = textParts.join("\n\n");
      metadata = {
        pageCount: totalPages,
        wordCount: extractedText.split(/\s+/).length,
      };
    } else if (fileType === "docx") {
      const mammoth = await import("mammoth");
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      extractedText = result.value;
      metadata = {
        wordCount: extractedText.split(/\s+/).length,
      };
      updateProgress(file.name, 100);
    } else if (fileType === "txt" || fileType === "md") {
      extractedText = await file.text();
      metadata = {
        wordCount: extractedText.split(/\s+/).length,
      };
      updateProgress(file.name, 100);
    }

    return {
      originalFilename: file.name,
      fileType,
      extractedText,
      metadata,
    };
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;

    // Initialize extraction states
    const newStates: FileExtractionState[] = files.map((f) => ({
      filename: f.name,
      progress: 0,
      status: "extracting" as const,
    }));
    setExtractionStates((prev) => [...prev, ...newStates]);

    const newArtifacts: Artifact[] = [];

    // Process files sequentially — extract text then save to API immediately
    for (const file of files) {
      try {
        const artifact = await extractSingleFile(file);
        if (artifact) {
          // Save to API immediately so extractedText is persisted server-side
          try {
            const res = await fetch(`/api/programs/${programId}/artifacts`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(artifact),
            });
            if (res.ok) {
              const saved = await res.json();
              artifact.id = saved.id;
            }
          } catch {
            // Non-critical — artifact can be saved later in handleGenerate
          }
          newArtifacts.push(artifact);
          setExtractionStates((prev) =>
            prev.map((s) => s.filename === file.name ? { ...s, status: "done", progress: 100 } : s)
          );
        } else {
          setExtractionStates((prev) =>
            prev.map((s) => s.filename === file.name ? { ...s, status: "error", error: "Unsupported file type" } : s)
          );
        }
      } catch (error) {
        console.error("Extraction error:", error);
        setExtractionStates((prev) =>
          prev.map((s) => s.filename === file.name
            ? { ...s, status: "error", error: error instanceof Error ? error.message : "Extraction failed" }
            : s
          )
        );
      }
    }

    if (newArtifacts.length > 0) {
      onArtifactsChange([...artifacts, ...newArtifacts]);
    }

    // Clear completed extraction states after a delay
    setTimeout(() => {
      setExtractionStates((prev) => prev.filter((s) => s.status === "extracting"));
    }, 2000);

    // Reset file input
    e.target.value = "";
  };

  const handleRemoveArtifact = (index: number) => {
    onArtifactsChange(artifacts.filter((_, i) => i !== index));
  };

  // Content summary
  const contentParts: string[] = [];
  if (videos.length > 0) contentParts.push(`${videos.length} video${videos.length !== 1 ? "s" : ""}`);
  if (artifacts.length > 0) contentParts.push(`${artifacts.length} document${artifacts.length !== 1 ? "s" : ""}`);
  const contentSummary = contentParts.length > 0
    ? contentParts.join(", ") + " added"
    : "No content added yet";

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-white mb-2">Program Content</h2>
        <p className="text-gray-400 text-sm">
          Add your content sources. The AI will analyze these to create your program structure.
        </p>
      </div>

      {/* Content summary */}
      <div className="text-sm text-gray-400 flex items-center gap-2">
        <svg className="w-4 h-4 text-neon-cyan flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        {contentSummary}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-surface-border">
        <button
          type="button"
          onClick={() => setActiveTab("youtube")}
          className={`
            px-4 py-2.5 text-sm font-medium transition -mb-px
            ${activeTab === "youtube"
              ? "text-neon-cyan border-b-2 border-neon-cyan"
              : "text-gray-400 hover:text-gray-300"
            }
          `}
        >
          YouTube Videos
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("upload")}
          className={`
            px-4 py-2.5 text-sm font-medium transition -mb-px
            ${activeTab === "upload"
              ? "text-neon-cyan border-b-2 border-neon-cyan"
              : "text-gray-400 hover:text-gray-300"
            }
          `}
        >
          Upload Files
        </button>
      </div>

      {/* YouTube tab */}
      {activeTab === "youtube" && (
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-300">
                YouTube Videos
              </label>
              <button
                type="button"
                onClick={() => setShowBatchMode(!showBatchMode)}
                className="text-xs text-neon-cyan hover:text-neon-cyan/80 transition"
              >
                {showBatchMode ? "Single URL mode" : "Paste multiple URLs"}
              </button>
            </div>

            {showBatchMode ? (
              <div className="space-y-3">
                <textarea
                  value={batchUrls}
                  onChange={(e) => setBatchUrls(e.target.value)}
                  placeholder="Paste YouTube URLs (one per line)...&#10;https://youtube.com/watch?v=...&#10;https://youtu.be/..."
                  rows={6}
                  disabled={isBatchProcessing}
                  className="w-full px-4 py-3 bg-surface-dark border border-surface-border rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:border-neon-cyan focus:ring-1 focus:ring-neon-cyan resize-none font-mono text-sm"
                />
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">
                    {batchUrls.split("\n").filter((l) => l.trim()).length} URLs (max 20)
                  </span>
                  <button
                    onClick={handleBatchAdd}
                    disabled={isBatchProcessing || !batchUrls.trim()}
                    className="px-4 py-2 bg-neon-cyan/20 border border-neon-cyan text-neon-cyan rounded-lg hover:bg-neon-cyan/30 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isBatchProcessing ? (
                      <span className="flex items-center gap-2">
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Processing...
                      </span>
                    ) : (
                      "Add All Videos"
                    )}
                  </button>
                </div>
                {batchProgress.errors.length > 0 && (
                  <div className="p-3 bg-neon-pink/10 border border-neon-pink/30 rounded-lg">
                    <p className="text-sm font-medium text-neon-pink mb-1">Some videos failed:</p>
                    <ul className="text-xs text-gray-400 space-y-1">
                      {batchProgress.errors.map((error, i) => (
                        <li key={i} className="truncate">• {error}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
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
            )}
          </div>

          {/* Video list */}
          {videos.length > 0 && (
            <div className="space-y-2">
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
                    className="p-1.5 text-gray-400 hover:text-neon-pink transition"
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
      )}

      {/* Upload tab */}
      {activeTab === "upload" && (
        <div className="space-y-4">
          <p className="text-xs text-gray-500">
            Upload documents to include in your program. Files are processed locally for privacy.
          </p>

          {/* File dropzone — mobile-optimized */}
          <label className="block cursor-pointer">
            <div className={`
              border-2 border-dashed rounded-lg p-8 sm:p-6 min-h-[120px] text-center transition flex flex-col items-center justify-center
              ${isExtracting
                ? "border-neon-pink bg-neon-pink/5"
                : "border-surface-border hover:border-neon-cyan hover:bg-neon-cyan/5 active:bg-neon-cyan/10"
              }
            `}>
              {isExtracting ? (
                <div>
                  <div className="w-8 h-8 mx-auto mb-2 border-2 border-neon-pink border-t-transparent rounded-full animate-spin" />
                  <p className="text-sm text-neon-pink">Processing files...</p>
                </div>
              ) : (
                <>
                  <svg className="w-8 h-8 mb-2 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  {/* Desktop copy */}
                  <p className="text-sm text-gray-400 hidden sm:block">
                    Drop files here, or <span className="text-neon-cyan">browse</span>
                  </p>
                  {/* Mobile copy */}
                  <p className="text-sm text-gray-400 block sm:hidden">
                    <span className="text-neon-cyan">Tap to choose files</span>
                  </p>
                  <p className="text-xs text-gray-500 mt-1">PDF, DOCX, TXT, or Markdown — max 10MB each</p>
                </>
              )}
            </div>
            <input
              type="file"
              accept={ACCEPTED_FILE_TYPES}
              onChange={handleFileUpload}
              disabled={isExtracting}
              multiple
              className="hidden"
            />
          </label>

          {/* Per-file extraction progress */}
          {extractionStates.length > 0 && (
            <div className="space-y-2">
              {extractionStates.map((state, i) => (
                <div key={`${state.filename}-${i}`} className="p-2 bg-surface-dark rounded-lg border border-surface-border">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-400 truncate flex-1">{state.filename}</span>
                    <span className="text-xs ml-2">
                      {state.status === "extracting" && <span className="text-neon-pink">{Math.round(state.progress)}%</span>}
                      {state.status === "done" && <span className="text-green-400">Done</span>}
                      {state.status === "error" && <span className="text-red-400">Error</span>}
                    </span>
                  </div>
                  <div className="h-1 bg-surface-border rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        state.status === "error" ? "bg-red-500" : state.status === "done" ? "bg-green-500" : "bg-neon-pink"
                      }`}
                      style={{ width: `${state.progress}%` }}
                    />
                  </div>
                  {state.error && (
                    <p className="text-xs text-red-400 mt-1">{state.error}</p>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Artifact list */}
          {artifacts.length > 0 && (
            <div className="space-y-2">
              {artifacts.map((artifact, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 p-3 bg-surface-dark rounded-lg border border-surface-border"
                >
                  <div className={`
                    w-10 h-10 rounded flex items-center justify-center text-xs font-medium
                    ${getFileTypeColor(artifact.fileType)}
                  `}>
                    {artifact.fileType.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate">{artifact.originalFilename}</p>
                    <p className="text-xs text-gray-500">
                      {artifact.metadata.pageCount && `${artifact.metadata.pageCount} pages · `}
                      {artifact.metadata.wordCount.toLocaleString()} words
                    </p>
                  </div>
                  <button
                    onClick={() => handleRemoveArtifact(index)}
                    className="p-1.5 text-gray-400 hover:text-neon-pink transition"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Privacy notice */}
          <div className="flex items-start gap-2 p-3 bg-neon-cyan/5 border border-neon-cyan/20 rounded-lg">
            <svg className="w-5 h-5 text-neon-cyan flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <div>
              <p className="text-sm text-neon-cyan font-medium">Privacy First</p>
              <p className="text-xs text-gray-400">
                Documents are processed entirely in your browser. Only the extracted text is saved — your original files never leave your device.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
