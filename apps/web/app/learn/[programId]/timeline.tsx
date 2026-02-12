"use client";

import { useState } from "react";
import Link from "next/link";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/components/ui/toast";

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
  enrolledAt: string;
  currentWeek: number; // Which week the learner currently has access to
  completedWeeks: number[]; // Array of completed week numbers
}

export function LearnerTimeline({
  program,
  userId,
  enrolledAt,
  currentWeek,
  completedWeeks,
}: Props) {
  const { showToast } = useToast();

  const [unlockedWeekNumber, setUnlockedWeekNumber] = useState(currentWeek);
  const [completedWeeksState, setCompletedWeeksState] = useState<Set<number>>(
    () => new Set(completedWeeks)
  );

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
  const [savingAction, setSavingAction] = useState<string | null>(null);

  async function completeAction(
    actionId: string,
    weekNumber: number,
    reflectionText?: string
  ) {
    setSavingAction(actionId);
    try {
      const res = await fetch("/api/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actionId,
          reflectionText,
          programId: program.id,
          weekNumber,
        }),
      });

      if (!res.ok) throw new Error("Failed to save");

      const data = await res.json();

      setCompletedActions((prev) => new Set(prev).add(actionId));

      // Check if week was completed and next week unlocked
      if (data.weekCompleted) {
        setCompletedWeeksState((prev) => new Set(prev).add(weekNumber));
        showToast(`Week ${weekNumber} complete! 🎉`, "success");
      }

      if (data.nextWeekUnlocked && data.newCurrentWeek) {
        setUnlockedWeekNumber(data.newCurrentWeek);
        showToast(`Week ${data.newCurrentWeek} unlocked!`, "success");
      } else if (!data.weekCompleted) {
        showToast("Progress saved!", "success");
      }
    } catch {
      showToast("Failed to save progress", "error");
    } finally {
      setSavingAction(null);
    }
  }

  return (
    <div className="min-h-screen gradient-bg-radial grid-bg">
      <nav className="flex items-center justify-between px-6 py-4 border-b border-surface-border/50 backdrop-blur-sm">
        <Link
          href="/"
          className="text-xl font-bold tracking-tight text-neon-cyan neon-text-cyan hover:opacity-80 transition"
        >
          ← GuideRail
        </Link>
        <div className="text-right">
          <p className="text-xs text-gray-500 uppercase tracking-wider">Learning</p>
          <h1 className="text-sm font-semibold text-white">{program.title}</h1>
        </div>
      </nav>

      <main className="max-w-xl mx-auto px-4 py-8 space-y-6">
        {/* Progress indicator */}
        <div className="bg-surface-card border border-surface-border rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-400 uppercase tracking-wider">
              Your Progress
            </span>
            <span className="text-xs text-neon-cyan">
              Week {Math.min(unlockedWeekNumber, program.weeks.length)} of{" "}
              {program.weeks.length} unlocked
            </span>
          </div>
          <div className="h-2 bg-surface-dark rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-neon-cyan to-neon-pink transition-all"
              style={{
                width: `${
                  (Math.min(unlockedWeekNumber, program.weeks.length) /
                    program.weeks.length) *
                  100
                }%`,
              }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Complete all actions in a week to unlock the next one
          </p>
        </div>

        {program.weeks.map((week) => {
          const isUnlocked = week.weekNumber <= unlockedWeekNumber;
          const isCurrentWeek =
            week.weekNumber === Math.min(unlockedWeekNumber, program.weeks.length);

          // Calculate completion for this week
          const weekActions = week.sessions.flatMap((s) => s.actions);
          const completedCount = weekActions.filter((a) =>
            completedActions.has(a.id)
          ).length;
          const isWeekComplete =
            weekActions.length > 0 && completedCount === weekActions.length;

          return (
            <section
              key={week.id}
              className={`rounded-xl border p-5 transition-all ${
                !isUnlocked
                  ? "bg-surface-dark/50 border-surface-border opacity-60"
                  : isCurrentWeek
                  ? "bg-surface-card border-neon-cyan/40 shadow-lg shadow-neon-cyan/5"
                  : isWeekComplete
                  ? "bg-surface-card border-neon-cyan/20"
                  : "bg-surface-card border-surface-border"
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <span
                    className={`text-xs font-bold uppercase tracking-widest px-2.5 py-1 rounded-full ${
                      !isUnlocked
                        ? "bg-gray-800 text-gray-500"
                        : isWeekComplete
                        ? "bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/30"
                        : isCurrentWeek
                        ? "bg-neon-pink/10 text-neon-pink border border-neon-pink/30"
                        : "bg-surface-dark text-gray-400"
                    }`}
                  >
                    Week {week.weekNumber}
                  </span>
                  <h2 className="font-medium text-sm text-white">{week.title}</h2>
                </div>
                <div className="flex items-center gap-2">
                  {isUnlocked && weekActions.length > 0 && (
                    <span className="text-xs text-gray-500">
                      {completedCount}/{weekActions.length}
                    </span>
                  )}
                  {isWeekComplete && (
                    <span className="text-neon-cyan text-xs font-medium">
                      ✓ Complete
                    </span>
                  )}
                </div>
              </div>

              {/* Locked state */}
              {!isUnlocked && (
                <div className="flex items-center justify-center py-8">
                  <div className="text-center">
                    <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-surface-dark border border-surface-border flex items-center justify-center">
                      <svg
                        className="w-6 h-6 text-gray-500"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                        />
                      </svg>
                    </div>
                    <p className="text-sm text-gray-400">
                      Complete{" "}
                      <span className="text-neon-yellow font-semibold">
                        Week {week.weekNumber - 1}
                      </span>{" "}
                      to unlock
                    </p>
                  </div>
                </div>
              )}

              {/* Unlocked content */}
              {isUnlocked &&
                week.sessions.map((session) => (
                  <div key={session.id} className="space-y-3">
                    {session.actions.map((action) => {
                      const done = completedActions.has(action.id);
                      const actionTypeColor =
                        action.type === "WATCH"
                          ? "text-neon-cyan"
                          : action.type === "REFLECT"
                          ? "text-neon-pink"
                          : action.type === "DO"
                          ? "text-neon-yellow"
                          : "text-gray-400";

                      return (
                        <div
                          key={action.id}
                          className={`p-4 rounded-lg border transition-all ${
                            done
                              ? "bg-surface-dark/50 border-surface-border"
                              : "bg-surface-dark border-surface-border hover:border-neon-cyan/30"
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <button
                              onClick={() => {
                                if (!done && savingAction !== action.id) {
                                  completeAction(
                                    action.id,
                                    week.weekNumber,
                                    reflections[action.id]
                                  );
                                }
                              }}
                              disabled={done || savingAction === action.id}
                              className={`mt-0.5 w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all ${
                                done
                                  ? "bg-neon-cyan border-neon-cyan text-surface-dark"
                                  : savingAction === action.id
                                  ? "border-neon-cyan"
                                  : "border-gray-600 hover:border-neon-cyan"
                              }`}
                            >
                              {savingAction === action.id ? (
                                <Spinner size="sm" />
                              ) : done ? (
                                <svg
                                  className="w-3 h-3"
                                  fill="currentColor"
                                  viewBox="0 0 20 20"
                                >
                                  <path
                                    fillRule="evenodd"
                                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                    clipRule="evenodd"
                                  />
                                </svg>
                              ) : null}
                            </button>
                            <div className="flex-1">
                              <p
                                className={`text-sm font-medium ${
                                  done ? "line-through text-gray-500" : "text-white"
                                }`}
                              >
                                {action.title}
                              </p>
                              <span
                                className={`text-xs uppercase tracking-wider ${actionTypeColor}`}
                              >
                                {action.type}
                              </span>

                              {action.instructions && !done && (
                                <p className="text-xs text-gray-500 mt-2">
                                  {action.instructions}
                                </p>
                              )}

                              {/* YouTube embed */}
                              {action.youtubeVideo && !done && (
                                <div className="mt-3 aspect-video rounded-lg overflow-hidden border border-surface-border">
                                  <iframe
                                    src={`https://www.youtube.com/embed/${action.youtubeVideo.videoId}`}
                                    className="w-full h-full"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen
                                  />
                                </div>
                              )}

                              {/* Reflection prompt */}
                              {action.type === "REFLECT" &&
                                action.reflectionPrompt &&
                                !done && (
                                  <div className="mt-3">
                                    <p className="text-xs text-neon-pink/80 italic mb-2">
                                      {action.reflectionPrompt}
                                    </p>
                                    <textarea
                                      value={reflections[action.id] ?? ""}
                                      onChange={(e) =>
                                        setReflections((r) => ({
                                          ...r,
                                          [action.id]: e.target.value,
                                        }))
                                      }
                                      placeholder="Write your reflection..."
                                      rows={3}
                                      className="w-full px-3 py-2 bg-surface-dark border border-surface-border rounded-lg text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-neon-pink focus:ring-1 focus:ring-neon-pink"
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
