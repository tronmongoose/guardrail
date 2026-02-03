"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";

interface YouTubeVideo {
  id: string;
  videoId: string;
  title: string | null;
  thumbnailUrl: string | null;
}

interface Program {
  id: string;
  title: string;
  description: string | null;
  durationWeeks: number;
  slug: string;
  published: boolean;
  priceInCents: number;
  videos: YouTubeVideo[];
  drafts: { id: string; status: string; createdAt: string }[];
  weeks: {
    id: string;
    title: string;
    weekNumber: number;
    sessions: {
      id: string;
      title: string;
      actions: { id: string; title: string; type: string }[];
    }[];
  }[];
}

export default function ProgramEditPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [program, setProgram] = useState<Program | null>(null);
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/programs/${id}`);
    if (res.ok) setProgram(await res.json());
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function saveBasics(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const form = new FormData(e.currentTarget);
    await fetch(`/api/programs/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: form.get("title"),
        description: form.get("description"),
        durationWeeks: Number(form.get("durationWeeks")),
        priceInCents: Math.round(Number(form.get("price")) * 100),
      }),
    });
    await load();
    setSaving(false);
  }

  async function addVideo() {
    if (!youtubeUrl.trim()) return;
    setError(null);
    const res = await fetch(`/api/programs/${id}/videos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: youtubeUrl }),
    });
    if (!res.ok) {
      setError("Invalid YouTube URL or fetch failed");
      return;
    }
    setYoutubeUrl("");
    await load();
  }

  async function generateStructure() {
    setGenerating(true);
    setError(null);
    // Step 1: auto-structure (embeddings + clustering)
    const s1 = await fetch(`/api/programs/${id}/auto-structure`, { method: "POST" });
    if (!s1.ok) {
      setError("Auto-structure failed");
      setGenerating(false);
      return;
    }
    // Step 2: generate full draft via LLM
    const s2 = await fetch(`/api/programs/${id}/generate`, { method: "POST" });
    if (!s2.ok) {
      setError("Draft generation failed");
      setGenerating(false);
      return;
    }
    await load();
    setGenerating(false);
  }

  async function publishProgram() {
    await fetch(`/api/programs/${id}/publish`, { method: "POST" });
    await load();
  }

  if (!program) {
    return (
      <div className="min-h-screen gradient-bg-radial grid-bg flex items-center justify-center">
        <div className="text-gray-400">Loading...</div>
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
        <span className={`text-xs px-3 py-1.5 rounded-full font-medium ${
          program.published
            ? "bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/30"
            : "bg-surface-card text-gray-400 border border-surface-border"
        }`}>
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
              className="px-5 py-2.5 bg-white text-surface-dark text-sm rounded-lg font-semibold hover:bg-gray-100 transition disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Changes"}
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
              className="flex-1 px-3 py-2.5 bg-surface-dark border border-surface-border rounded-lg text-white text-sm placeholder:text-gray-500 focus:outline-none focus:border-neon-cyan focus:ring-1 focus:ring-neon-cyan"
            />
            <button
              onClick={addVideo}
              className="btn-neon px-5 py-2.5 rounded-lg text-surface-dark text-sm font-semibold"
            >
              Add
            </button>
          </div>
          {error && (
            <p className="text-sm text-neon-pink mb-3 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-neon-pink" />
              {error}
            </p>
          )}
          {program.videos.length === 0 ? (
            <p className="text-sm text-gray-500">No videos added yet</p>
          ) : (
            <div className="space-y-2">
              {program.videos.map((v) => (
                <div key={v.id} className="flex items-center gap-3 p-3 bg-surface-dark border border-surface-border rounded-lg">
                  {v.thumbnailUrl && (
                    <img src={v.thumbnailUrl} alt="" className="w-20 h-12 rounded object-cover" />
                  )}
                  <span className="text-sm text-gray-300 flex-1">{v.title || v.videoId}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Generate */}
        <section className="bg-surface-card border border-surface-border rounded-xl p-6">
          <h2 className="font-semibold text-white mb-2">AI Structure</h2>
          <p className="text-sm text-gray-500 mb-4">
            Generate a week-by-week structure from your videos using AI.
          </p>
          <button
            onClick={generateStructure}
            disabled={generating || program.videos.length === 0}
            className="btn-neon-pink px-5 py-2.5 rounded-lg text-white text-sm font-semibold disabled:opacity-50"
          >
            {generating ? "Generating..." : "Generate Program Structure"}
          </button>
        </section>

        {/* Structure preview */}
        {program.weeks.length > 0 && (
          <section className="bg-surface-card border border-surface-border rounded-xl p-6">
            <h2 className="font-semibold text-white mb-4">Program Structure</h2>
            <div className="space-y-4">
              {program.weeks.map((w) => (
                <div key={w.id} className="border-l-2 border-neon-cyan pl-4">
                  <h3 className="font-medium text-white">{w.title}</h3>
                  {w.sessions.map((s) => (
                    <div key={s.id} className="ml-2 mt-2">
                      <p className="text-sm text-gray-400">{s.title}</p>
                      <ul className="ml-4 mt-1 space-y-1">
                        {s.actions.map((a) => (
                          <li key={a.id} className="text-xs text-gray-500 flex items-center gap-2">
                            <span className={`inline-block w-1.5 h-1.5 rounded-full ${
                              a.type === "WATCH" ? "bg-neon-cyan" :
                              a.type === "REFLECT" ? "bg-neon-pink" :
                              a.type === "DO" ? "bg-neon-yellow" : "bg-gray-500"
                            }`} />
                            {a.title}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Publish */}
        {!program.published && program.weeks.length > 0 && (
          <button
            onClick={publishProgram}
            className="w-full py-4 bg-gradient-to-r from-neon-cyan to-neon-pink text-surface-dark rounded-xl font-bold hover:opacity-90 transition"
          >
            Publish Program
          </button>
        )}
      </main>
    </div>
  );
}
