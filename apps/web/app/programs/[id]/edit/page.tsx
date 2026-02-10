"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/components/ui/toast";
import {
  StructureBuilder,
  type WeekData,
  type YouTubeVideoData,
} from "@/components/builder";

interface Program {
  id: string;
  title: string;
  description: string | null;
  outcomeStatement: string | null;
  durationWeeks: number;
  slug: string;
  published: boolean;
  priceInCents: number;
  videos: YouTubeVideoData[];
  drafts: { id: string; status: string; createdAt: string }[];
  weeks: WeekData[];
}

export default function ProgramEditPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { showToast } = useToast();

  const [program, setProgram] = useState<Program | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [addingVideo, setAddingVideo] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const load = useCallback(async (retryCount = 0) => {
    const maxRetries = 3;
    const retryDelay = 500; // ms

    try {
      const res = await fetch(`/api/programs/${id}`, {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache" }
      });
      if (!res.ok) {
        // If 404 and we have retries left, wait and retry
        // (handles race condition when program was just created)
        if (res.status === 404 && retryCount < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, retryDelay * (retryCount + 1)));
          return load(retryCount + 1);
        }
        throw new Error("Failed to load program");
      }
      setProgram(await res.json());
      setLoadError(null);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function saveBasics(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    try {
      const form = new FormData(e.currentTarget);
      const res = await fetch(`/api/programs/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.get("title"),
          description: form.get("description"),
          outcomeStatement: form.get("outcomeStatement"),
          durationWeeks: Number(form.get("durationWeeks")),
          priceInCents: Math.round(Number(form.get("price")) * 100),
        }),
      });
      if (!res.ok) throw new Error("Save failed");
      await load();
      showToast("Changes saved", "success");
    } catch {
      showToast("Failed to save changes", "error");
    } finally {
      setSaving(false);
    }
  }

  async function addVideo() {
    if (!youtubeUrl.trim()) return;
    setAddingVideo(true);
    try {
      const res = await fetch(`/api/programs/${id}/videos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: youtubeUrl }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Invalid YouTube URL");
      }
      setYoutubeUrl("");
      await load();
      showToast("Video added", "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to add video", "error");
    } finally {
      setAddingVideo(false);
    }
  }

  async function generateStructure() {
    setGenerating(true);
    try {
      // Step 1: auto-structure (embeddings + clustering)
      const s1 = await fetch(`/api/programs/${id}/auto-structure`, { method: "POST" });
      if (!s1.ok) {
        const data = await s1.json().catch(() => ({}));
        throw new Error(data.error || "Auto-structure failed");
      }

      // Step 2: generate full draft via LLM
      const s2 = await fetch(`/api/programs/${id}/generate`, { method: "POST" });
      if (!s2.ok) {
        const data = await s2.json().catch(() => ({}));
        throw new Error(data.error || "Draft generation failed");
      }

      await load();
      showToast("Program structure generated!", "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Generation failed", "error");
    } finally {
      setGenerating(false);
    }
  }

  async function publishProgram() {
    setPublishing(true);
    try {
      const res = await fetch(`/api/programs/${id}/publish`, { method: "POST" });
      if (!res.ok) throw new Error("Publish failed");
      await load();
      showToast("Program published!", "success");
    } catch {
      showToast("Failed to publish program", "error");
    } finally {
      setPublishing(false);
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen gradient-bg-radial grid-bg flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Spinner size="lg" />
          <p className="text-sm text-gray-400">Loading program...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (loadError || !program) {
    return (
      <div className="min-h-screen gradient-bg-radial grid-bg flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-neon-pink/10 border border-neon-pink/30 flex items-center justify-center">
            <svg className="w-8 h-8 text-neon-pink" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <p className="text-lg text-white mb-2">Failed to load program</p>
          <p className="text-sm text-gray-500 mb-4">{loadError || "Program not found"}</p>
          <button
            onClick={() => router.push("/dashboard")}
            className="px-4 py-2 bg-surface-card border border-surface-border rounded-lg text-sm text-gray-300 hover:border-neon-cyan transition"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-bg-radial grid-bg">
      <nav className="flex items-center justify-between px-6 py-4 border-b border-surface-border/50 backdrop-blur-sm">
        <button
          onClick={() => router.push("/dashboard")}
          className="text-xl font-bold tracking-tight text-neon-cyan neon-text-cyan hover:opacity-80 transition"
        >
          ← GuideRail
        </button>
        <span
          className={`text-xs px-3 py-1.5 rounded-full font-medium ${
            program.published
              ? "bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/30"
              : "bg-surface-card text-gray-400 border border-surface-border"
          }`}
        >
          {program.published ? "Published" : "Draft"}
        </span>
      </nav>

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {/* Basics */}
        <section className="bg-surface-card border border-surface-border rounded-xl p-6">
          <h2 className="font-semibold text-white mb-4">Program Details</h2>
          <form onSubmit={saveBasics} className="space-y-4">
            <div>
              <label className="text-sm text-gray-400">Title</label>
              <input
                name="title"
                defaultValue={program.title}
                className="w-full mt-1 px-3 py-2.5 bg-surface-dark border border-surface-border rounded-lg text-white text-sm focus:outline-none focus:border-neon-cyan focus:ring-1 focus:ring-neon-cyan"
              />
            </div>
            <div>
              <label className="text-sm text-gray-400">Description</label>
              <textarea
                name="description"
                defaultValue={program.description ?? ""}
                rows={3}
                className="w-full mt-1 px-3 py-2.5 bg-surface-dark border border-surface-border rounded-lg text-white text-sm focus:outline-none focus:border-neon-cyan focus:ring-1 focus:ring-neon-cyan"
              />
            </div>
            <div>
              <label className="text-sm text-gray-400">Outcome Statement</label>
              <textarea
                name="outcomeStatement"
                defaultValue={program.outcomeStatement ?? ""}
                rows={2}
                placeholder="By the end of this program, learners will..."
                className="w-full mt-1 px-3 py-2.5 bg-surface-dark border border-surface-border rounded-lg text-white text-sm placeholder:text-gray-500 focus:outline-none focus:border-neon-cyan focus:ring-1 focus:ring-neon-cyan"
              />
              <p className="text-xs text-gray-500 mt-1">What transformation will learners achieve?</p>
            </div>
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="text-sm text-gray-400">Weeks</label>
                <input
                  name="durationWeeks"
                  type="number"
                  min={1}
                  max={52}
                  defaultValue={program.durationWeeks}
                  className="w-full mt-1 px-3 py-2.5 bg-surface-dark border border-surface-border rounded-lg text-white text-sm focus:outline-none focus:border-neon-cyan focus:ring-1 focus:ring-neon-cyan"
                />
              </div>
              <div className="flex-1">
                <label className="text-sm text-gray-400">Price (USD)</label>
                <input
                  name="price"
                  type="number"
                  step="0.01"
                  min={0}
                  defaultValue={(program.priceInCents / 100).toFixed(2)}
                  className="w-full mt-1 px-3 py-2.5 bg-surface-dark border border-surface-border rounded-lg text-white text-sm focus:outline-none focus:border-neon-cyan focus:ring-1 focus:ring-neon-cyan"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 bg-white text-surface-dark text-sm rounded-lg font-semibold hover:bg-gray-100 transition disabled:opacity-50 flex items-center gap-2"
            >
              {saving ? (
                <>
                  <Spinner size="sm" color="pink" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </button>
          </form>
        </section>

        {/* Videos */}
        <section className="bg-surface-card border border-surface-border rounded-xl p-6">
          <h2 className="font-semibold text-white mb-4">YouTube Videos</h2>
          <div className="flex gap-2 mb-4">
            <input
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
              placeholder="Paste YouTube URL..."
              disabled={addingVideo}
              onKeyDown={(e) => e.key === "Enter" && addVideo()}
              className="flex-1 px-3 py-2.5 bg-surface-dark border border-surface-border rounded-lg text-white text-sm placeholder:text-gray-500 focus:outline-none focus:border-neon-cyan focus:ring-1 focus:ring-neon-cyan disabled:opacity-50"
            />
            <button
              onClick={addVideo}
              disabled={addingVideo || !youtubeUrl.trim()}
              className="btn-neon px-5 py-2.5 rounded-lg text-surface-dark text-sm font-semibold disabled:opacity-50 flex items-center gap-2"
            >
              {addingVideo ? (
                <>
                  <Spinner size="sm" color="pink" />
                  Adding...
                </>
              ) : (
                "Add"
              )}
            </button>
          </div>

          {/* Empty state */}
          {program.videos.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-surface-dark border border-surface-border flex items-center justify-center">
                <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-sm text-gray-400">No videos added yet</p>
              <p className="text-xs text-gray-500 mt-1">Paste a YouTube URL above to get started</p>
            </div>
          ) : (
            <div className="space-y-2">
              {program.videos.map((v) => (
                <div
                  key={v.id}
                  className="flex items-center gap-3 p-3 bg-surface-dark border border-surface-border rounded-lg"
                >
                  {v.thumbnailUrl ? (
                    <img src={v.thumbnailUrl} alt="" className="w-20 h-12 rounded object-cover" />
                  ) : (
                    <div className="w-20 h-12 rounded bg-surface-card flex items-center justify-center">
                      <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  )}
                  <span className="text-sm text-gray-300 flex-1">{v.title || v.videoId}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Structure Builder */}
        <section className="bg-surface-card border border-surface-border rounded-xl p-6">
          <h2 className="font-semibold text-white mb-4">Program Structure</h2>
          <StructureBuilder
            programId={program.id}
            weeks={program.weeks}
            videos={program.videos}
            onUpdate={load}
          />
        </section>

        {/* AI Generation (optional) */}
        {program.videos.length > 0 && (
          <section className="bg-surface-card border border-surface-border rounded-xl p-6">
            <h2 className="font-semibold text-white mb-2">AI Structure Generation</h2>
            <p className="text-sm text-gray-500 mb-4">
              {program.weeks.length > 0
                ? "Replace your current structure with an AI-generated one based on your videos."
                : "Let AI create an initial structure from your videos."}
            </p>

            {generating ? (
              <div className="flex items-center gap-3 py-2">
                <Spinner size="md" color="pink" />
                <div>
                  <p className="text-sm text-white">Generating structure...</p>
                  <p className="text-xs text-gray-500">This may take a moment</p>
                </div>
              </div>
            ) : (
              <button
                onClick={() => {
                  if (program.weeks.length > 0) {
                    if (!confirm("This will replace your current structure. Continue?")) {
                      return;
                    }
                  }
                  generateStructure();
                }}
                className="btn-neon-pink px-5 py-2.5 rounded-lg text-white text-sm font-semibold"
              >
                {program.weeks.length > 0 ? "Regenerate with AI" : "Generate with AI"}
              </button>
            )}
          </section>
        )}

        {/* Publish */}
        {!program.published && program.weeks.length > 0 && (
          <button
            onClick={publishProgram}
            disabled={publishing}
            className="w-full py-4 bg-gradient-to-r from-neon-cyan to-neon-pink text-surface-dark rounded-xl font-bold hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {publishing ? (
              <>
                <Spinner size="sm" color="white" />
                Publishing...
              </>
            ) : (
              "Publish Program"
            )}
          </button>
        )}
      </main>
    </div>
  );
}
