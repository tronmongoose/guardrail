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

  if (!program) return <div className="p-8 text-center text-gray-400">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-100">
        <button onClick={() => router.push("/dashboard")} className="text-lg font-semibold tracking-tight">
          ← GuideRail
        </button>
        <span className={`text-xs px-2 py-1 rounded-full ${program.published ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
          {program.published ? "Published" : "Draft"}
        </span>
      </nav>

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-8">
        {/* Basics */}
        <section className="bg-white rounded-xl border border-gray-100 p-6">
          <h2 className="font-semibold mb-4">Program Details</h2>
          <form onSubmit={saveBasics} className="space-y-4">
            <div>
              <label className="text-sm text-gray-500">Title</label>
              <input
                name="title"
                defaultValue={program.title}
                className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="text-sm text-gray-500">Description</label>
              <textarea
                name="description"
                defaultValue={program.description ?? ""}
                rows={3}
                className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="text-sm text-gray-500">Weeks</label>
                <input
                  name="durationWeeks"
                  type="number"
                  min={1}
                  max={52}
                  defaultValue={program.durationWeeks}
                  className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div className="flex-1">
                <label className="text-sm text-gray-500">Price (USD)</label>
                <input
                  name="price"
                  type="number"
                  step="0.01"
                  min={0}
                  defaultValue={(program.priceInCents / 100).toFixed(2)}
                  className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-gray-900 text-white text-sm rounded-lg font-medium hover:bg-gray-800 transition disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save"}
            </button>
          </form>
        </section>

        {/* Videos */}
        <section className="bg-white rounded-xl border border-gray-100 p-6">
          <h2 className="font-semibold mb-4">YouTube Videos</h2>
          <div className="flex gap-2 mb-4">
            <input
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
              placeholder="Paste YouTube URL..."
              className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <button
              onClick={addVideo}
              className="px-4 py-2 bg-brand-600 text-white text-sm rounded-lg font-medium hover:bg-brand-700 transition"
            >
              Add
            </button>
          </div>
          {error && <p className="text-sm text-red-500 mb-3">{error}</p>}
          {program.videos.length === 0 ? (
            <p className="text-sm text-gray-400">No videos added yet</p>
          ) : (
            <div className="space-y-2">
              {program.videos.map((v) => (
                <div key={v.id} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                  {v.thumbnailUrl && (
                    <img src={v.thumbnailUrl} alt="" className="w-16 h-10 rounded object-cover" />
                  )}
                  <span className="text-sm flex-1">{v.title || v.videoId}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Generate */}
        <section className="bg-white rounded-xl border border-gray-100 p-6">
          <h2 className="font-semibold mb-4">AI Structure</h2>
          <p className="text-sm text-gray-500 mb-4">
            Generate a week-by-week structure from your videos using AI.
          </p>
          <button
            onClick={generateStructure}
            disabled={generating || program.videos.length === 0}
            className="px-4 py-2 bg-brand-600 text-white text-sm rounded-lg font-medium hover:bg-brand-700 transition disabled:opacity-50"
          >
            {generating ? "Generating..." : "Generate Program Structure"}
          </button>
        </section>

        {/* Structure preview */}
        {program.weeks.length > 0 && (
          <section className="bg-white rounded-xl border border-gray-100 p-6">
            <h2 className="font-semibold mb-4">Program Structure</h2>
            <div className="space-y-4">
              {program.weeks.map((w) => (
                <div key={w.id} className="border-l-2 border-brand-500 pl-4">
                  <h3 className="font-medium">{w.title}</h3>
                  {w.sessions.map((s) => (
                    <div key={s.id} className="ml-2 mt-2">
                      <p className="text-sm text-gray-600">{s.title}</p>
                      <ul className="ml-4 mt-1 space-y-1">
                        {s.actions.map((a) => (
                          <li key={a.id} className="text-xs text-gray-400 flex items-center gap-2">
                            <span className={`inline-block w-1.5 h-1.5 rounded-full ${
                              a.type === "WATCH" ? "bg-blue-400" :
                              a.type === "REFLECT" ? "bg-purple-400" :
                              a.type === "DO" ? "bg-green-400" : "bg-gray-400"
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
            className="w-full py-3 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition"
          >
            Publish Program
          </button>
        )}
      </main>
    </div>
  );
}
