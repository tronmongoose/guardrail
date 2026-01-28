"use client";

import { useState } from "react";

interface ActionProgress {
  id: string;
  completed: boolean;
  reflectionText: string | null;
}

interface ActionData {
  id: string;
  title: string;
  type: string;
  instructions: string | null;
  reflectionPrompt: string | null;
  youtubeVideo: { videoId: string; title: string | null } | null;
  progress: ActionProgress[];
}

interface Props {
  program: {
    id: string;
    title: string;
    weeks: {
      id: string;
      title: string;
      weekNumber: number;
      sessions: {
        id: string;
        title: string;
        actions: ActionData[];
      }[];
    }[];
  };
  userId: string;
}

export function LearnerTimeline({ program, userId }: Props) {
  const [completedActions, setCompletedActions] = useState<Set<string>>(() => {
    const set = new Set<string>();
    for (const w of program.weeks) {
      for (const s of w.sessions) {
        for (const a of s.actions) {
          if (a.progress[0]?.completed) set.add(a.id);
        }
      }
    }
    return set;
  });

  const [reflections, setReflections] = useState<Record<string, string>>({});

  // Find current week (simple: first week with incomplete action)
  const currentWeekNumber =
    program.weeks.find((w) =>
      w.sessions.some((s) => s.actions.some((a) => !completedActions.has(a.id)))
    )?.weekNumber ?? 1;

  async function completeAction(actionId: string, reflectionText?: string) {
    await fetch("/api/progress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actionId, reflectionText }),
    });
    setCompletedActions((prev) => new Set(prev).add(actionId));
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="px-6 py-4 bg-white border-b border-gray-100">
        <p className="text-sm text-gray-400">Learning</p>
        <h1 className="text-lg font-semibold">{program.title}</h1>
      </nav>

      <main className="max-w-xl mx-auto px-4 py-8 space-y-8">
        {program.weeks.map((week) => {
          const isCurrentWeek = week.weekNumber === currentWeekNumber;
          const isPastWeek = week.weekNumber < currentWeekNumber;

          return (
            <section
              key={week.id}
              className={`rounded-xl border p-5 ${
                isCurrentWeek
                  ? "bg-white border-brand-200 shadow-sm"
                  : isPastWeek
                  ? "bg-white border-gray-100 opacity-75"
                  : "bg-gray-50 border-gray-100 opacity-50"
              }`}
            >
              <div className="flex items-center gap-2 mb-4">
                <span className="text-xs font-medium text-brand-600 bg-brand-50 px-2 py-0.5 rounded-full">
                  Week {week.weekNumber}
                </span>
                <h2 className="font-medium text-sm">{week.title}</h2>
              </div>

              {week.sessions.map((session) => (
                <div key={session.id} className="space-y-3">
                  {session.actions.map((action) => {
                    const done = completedActions.has(action.id);
                    return (
                      <div
                        key={action.id}
                        className={`p-4 rounded-lg border ${
                          done ? "bg-gray-50 border-gray-100" : "bg-white border-gray-200"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <button
                            onClick={() => {
                              if (!done) {
                                completeAction(action.id, reflections[action.id]);
                              }
                            }}
                            className={`mt-0.5 w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                              done
                                ? "bg-brand-600 border-brand-600 text-white"
                                : "border-gray-300 hover:border-brand-500"
                            }`}
                          >
                            {done && (
                              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                <path
                                  fillRule="evenodd"
                                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            )}
                          </button>
                          <div className="flex-1">
                            <p className={`text-sm font-medium ${done ? "line-through text-gray-400" : ""}`}>
                              {action.title}
                            </p>
                            <span className="text-xs text-gray-400 uppercase">{action.type}</span>

                            {action.instructions && (
                              <p className="text-xs text-gray-500 mt-1">{action.instructions}</p>
                            )}

                            {/* YouTube embed */}
                            {action.youtubeVideo && !done && (
                              <div className="mt-3 aspect-video rounded-lg overflow-hidden">
                                <iframe
                                  src={`https://www.youtube.com/embed/${action.youtubeVideo.videoId}`}
                                  className="w-full h-full"
                                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                  allowFullScreen
                                />
                              </div>
                            )}

                            {/* Reflection prompt */}
                            {action.type === "REFLECT" && action.reflectionPrompt && !done && (
                              <div className="mt-3">
                                <p className="text-xs text-gray-500 italic mb-2">{action.reflectionPrompt}</p>
                                <textarea
                                  value={reflections[action.id] ?? ""}
                                  onChange={(e) =>
                                    setReflections((r) => ({ ...r, [action.id]: e.target.value }))
                                  }
                                  placeholder="Write your reflection..."
                                  rows={3}
                                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </section>
          );
        })}
      </main>
    </div>
  );
}
