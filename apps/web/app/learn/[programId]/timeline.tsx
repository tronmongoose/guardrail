"use client";

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
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

type PacingMode = "DRIP_BY_WEEK" | "UNLOCK_ON_COMPLETE";

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
  currentWeek: number;
  completedWeeks: number[];
  pacingMode: PacingMode;
}

const ACTION_TYPE_COLORS: Record<string, string> = {
  WATCH: "text-neon-cyan",
  REFLECT: "text-neon-pink",
  DO: "text-neon-yellow",
  READ: "text-neon-cyan",
};

const ACTION_TYPE_VERBS: Record<string, string> = {
  WATCH: "Watch this video",
  READ: "Read this content",
  DO: "Complete this exercise",
  REFLECT: "Write your reflection",
};

export function LearnerTimeline({
  program,
  userId,
  enrolledAt,
  currentWeek,
  completedWeeks,
  pacingMode,
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

  // Celebration overlay state
  const [celebration, setCelebration] = useState<{
    weekNumber: number;
    weekTitle: string;
    actionCount: number;
    isLastWeek: boolean;
  } | null>(null);

  // Ref for auto-scrolling to next action
  const nextActionRef = useRef<HTMLDivElement>(null);
  const hasScrolledRef = useRef(false);

  // Floating continue button visibility
  const [showFloatingContinue, setShowFloatingContinue] = useState(false);

  // Compute overall progress
  const { totalActions, completedCount, progressPercent } = useMemo(() => {
    let total = 0;
    let done = 0;
    for (const w of program.weeks) {
      for (const s of w.sessions) {
        for (const a of s.actions) {
          total++;
          if (completedActions.has(a.id)) done++;
        }
      }
    }
    return {
      totalActions: total,
      completedCount: done,
      progressPercent: total > 0 ? Math.round((done / total) * 100) : 0,
    };
  }, [program.weeks, completedActions]);

  const isProgramComplete = totalActions > 0 && completedCount === totalActions;

  // Find the next action (first incomplete action in order)
  const nextActionId = useMemo(() => {
    for (const week of program.weeks) {
      if (week.weekNumber > unlockedWeekNumber) break;
      for (const session of week.sessions) {
        for (const action of session.actions) {
          if (!completedActions.has(action.id)) return action.id;
        }
      }
    }
    return null;
  }, [program.weeks, completedActions, unlockedWeekNumber]);

  // Auto-scroll to next action on first render
  useEffect(() => {
    if (nextActionRef.current && !hasScrolledRef.current) {
      hasScrolledRef.current = true;
      // Small delay to let the layout settle
      setTimeout(() => {
        nextActionRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 300);
    }
  }, [nextActionId]);

  // IntersectionObserver for floating continue button
  useEffect(() => {
    const el = nextActionRef.current;
    if (!el || !nextActionId) {
      setShowFloatingContinue(false);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => setShowFloatingContinue(!entry.isIntersecting),
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [nextActionId]);

  const scrollToNextAction = useCallback(() => {
    nextActionRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, []);

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

      if (data.weekCompleted) {
        setCompletedWeeksState((prev) => new Set(prev).add(weekNumber));

        // Find week details for celebration
        const week = program.weeks.find((w) => w.weekNumber === weekNumber);
        const weekActionCount = week?.sessions.flatMap((s) => s.actions).length ?? 0;
        const isLastWeek = weekNumber === program.weeks.length;

        setCelebration({
          weekNumber,
          weekTitle: week?.title ?? `Week ${weekNumber}`,
          actionCount: weekActionCount,
          isLastWeek,
        });

        // Auto-dismiss celebration after 6 seconds
        setTimeout(() => setCelebration(null), 6000);
      }

      if (data.nextWeekUnlocked && data.newCurrentWeek) {
        setUnlockedWeekNumber(data.newCurrentWeek);
      } else if (!data.weekCompleted) {
        showToast("Progress saved!", "success");
      }
    } catch {
      showToast("Failed to save progress", "error");
    } finally {
      setSavingAction(null);
    }
  }

  // Find the next action's details for floating button
  const nextActionDetails = useMemo(() => {
    if (!nextActionId) return null;
    for (const week of program.weeks) {
      for (const session of week.sessions) {
        for (const action of session.actions) {
          if (action.id === nextActionId) return action;
        }
      }
    }
    return null;
  }, [nextActionId, program.weeks]);

  return (
    <div className="min-h-screen gradient-bg-radial grid-bg">
      <nav className="flex items-center justify-between px-6 py-4 border-b border-surface-border/50 backdrop-blur-sm">
        <Link
          href="/"
          className="text-xl font-bold tracking-tight text-neon-cyan neon-text-cyan hover:opacity-80 transition"
        >
          &larr; GuideRail
        </Link>
        <div className="text-right">
          <p className="text-xs text-gray-500 uppercase tracking-wider">Learning</p>
          <h1 className="text-sm font-semibold text-white">{program.title}</h1>
        </div>
      </nav>

      <main className="max-w-xl mx-auto px-4 py-8 space-y-6 pb-24">
        {/* Action-level progress bar */}
        <div className="bg-surface-card border border-surface-border rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-400 uppercase tracking-wider">
              Your Progress
            </span>
            <span className="text-xs text-neon-cyan font-medium">
              {completedCount} of {totalActions} actions &middot; {progressPercent}%
            </span>
          </div>
          <div className="h-2 bg-surface-dark rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-neon-cyan to-neon-pink transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-2">
            {isProgramComplete
              ? "You've completed everything!"
              : pacingMode === "UNLOCK_ON_COMPLETE"
              ? "Complete all actions in a week to unlock the next one"
              : "New content unlocks each week"}
          </p>
        </div>

        {/* Week cards */}
        {program.weeks.map((week) => {
          const isUnlocked = week.weekNumber <= unlockedWeekNumber;
          const isCurrentWeek =
            week.weekNumber === Math.min(unlockedWeekNumber, program.weeks.length);

          const weekActions = week.sessions.flatMap((s) => s.actions);
          const weekCompletedCount = weekActions.filter((a) =>
            completedActions.has(a.id)
          ).length;
          const isWeekComplete =
            weekActions.length > 0 && weekCompletedCount === weekActions.length;
          const weekProgress =
            weekActions.length > 0
              ? Math.round((weekCompletedCount / weekActions.length) * 100)
              : 0;

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
              <div className="flex items-center justify-between mb-2">
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
                      {weekCompletedCount}/{weekActions.length}
                    </span>
                  )}
                  {isWeekComplete && (
                    <span className="text-neon-cyan text-xs font-medium">
                      &#10003; Complete
                    </span>
                  )}
                </div>
              </div>

              {/* Week progress bar */}
              {isUnlocked && weekActions.length > 0 && (
                <div className="h-1 bg-surface-dark rounded-full overflow-hidden mb-4">
                  <div
                    className="h-full bg-gradient-to-r from-neon-cyan to-neon-pink transition-all duration-500"
                    style={{ width: `${weekProgress}%` }}
                  />
                </div>
              )}

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
                      {pacingMode === "UNLOCK_ON_COMPLETE" ? (
                        <>
                          Complete{" "}
                          <span className="text-neon-yellow font-semibold">
                            Week {week.weekNumber - 1}
                          </span>{" "}
                          to unlock
                        </>
                      ) : (
                        <>
                          Unlocks in{" "}
                          <span className="text-neon-cyan font-semibold">
                            {(() => {
                              const enrolled = new Date(enrolledAt);
                              const unlockDate = new Date(enrolled.getTime() + (week.weekNumber - 1) * 7 * 24 * 60 * 60 * 1000);
                              const now = new Date();
                              const daysUntil = Math.ceil((unlockDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                              return daysUntil === 1 ? "1 day" : `${daysUntil} days`;
                            })()}
                          </span>
                        </>
                      )}
                    </p>
                  </div>
                </div>
              )}

              {/* Unlocked content with session grouping */}
              {isUnlocked &&
                week.sessions.map((session) => {
                  const sessionActions = session.actions;
                  const sessionCompleted = sessionActions.filter((a) =>
                    completedActions.has(a.id)
                  ).length;

                  return (
                    <div key={session.id} className="mb-4 last:mb-0">
                      {/* Session sub-header */}
                      {week.sessions.length > 1 && (
                        <div className="flex items-center justify-between mb-2 mt-3 first:mt-0">
                          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                            {session.title}
                          </h3>
                          <span className="text-xs text-gray-600">
                            {sessionCompleted}/{sessionActions.length}
                          </span>
                        </div>
                      )}

                      <div className="space-y-3">
                        {session.actions.map((action) => {
                          const done = completedActions.has(action.id);
                          const isNext = action.id === nextActionId;
                          const actionTypeColor =
                            ACTION_TYPE_COLORS[action.type] ?? "text-gray-400";

                          return (
                            <div
                              key={action.id}
                              ref={isNext ? nextActionRef : undefined}
                              className={`p-4 rounded-lg border transition-all ${
                                isNext
                                  ? "bg-surface-dark border-neon-cyan/50 shadow-md shadow-neon-cyan/10 pulse-ring-border"
                                  : done
                                  ? "bg-surface-dark/50 border-surface-border"
                                  : "bg-surface-dark border-surface-border hover:border-neon-cyan/30"
                              }`}
                            >
                              {/* UP NEXT badge */}
                              {isNext && (
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-neon-cyan/15 text-neon-cyan border border-neon-cyan/30">
                                    Up Next
                                  </span>
                                  <span className="text-xs text-gray-500">
                                    {ACTION_TYPE_VERBS[action.type] ?? "Complete this"}
                                  </span>
                                </div>
                              )}

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
                    </div>
                  );
                })}
            </section>
          );
        })}

        {/* Program completion card */}
        {isProgramComplete && (
          <div className="bg-surface-card border border-neon-cyan/40 rounded-xl p-6 text-center animate-slide-up">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-neon-cyan/10 border border-neon-cyan/30 flex items-center justify-center">
              <svg className="w-8 h-8 text-neon-cyan" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-white mb-1">Program Complete!</h3>
            <p className="text-sm text-gray-400">
              You completed all {totalActions} actions across {program.weeks.length} weeks
            </p>
          </div>
        )}
      </main>

      {/* Milestone celebration overlay */}
      {celebration && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="relative bg-surface-card border border-neon-cyan/40 rounded-2xl p-8 max-w-sm w-full text-center animate-slide-up shadow-2xl shadow-neon-cyan/10 overflow-hidden">
            {/* Confetti particles */}
            <div className="confetti-burst" aria-hidden="true">
              <span className="confetti-dot" style={{ "--dot-color": "#00fff0", "--dot-angle": "0deg", "--dot-distance": "80px" } as React.CSSProperties} />
              <span className="confetti-dot" style={{ "--dot-color": "#ff2dff", "--dot-angle": "45deg", "--dot-distance": "70px" } as React.CSSProperties} />
              <span className="confetti-dot" style={{ "--dot-color": "#ffd600", "--dot-angle": "90deg", "--dot-distance": "85px" } as React.CSSProperties} />
              <span className="confetti-dot" style={{ "--dot-color": "#00fff0", "--dot-angle": "135deg", "--dot-distance": "75px" } as React.CSSProperties} />
              <span className="confetti-dot" style={{ "--dot-color": "#ff2dff", "--dot-angle": "180deg", "--dot-distance": "80px" } as React.CSSProperties} />
              <span className="confetti-dot" style={{ "--dot-color": "#ffd600", "--dot-angle": "225deg", "--dot-distance": "70px" } as React.CSSProperties} />
              <span className="confetti-dot" style={{ "--dot-color": "#00fff0", "--dot-angle": "270deg", "--dot-distance": "85px" } as React.CSSProperties} />
              <span className="confetti-dot" style={{ "--dot-color": "#ff2dff", "--dot-angle": "315deg", "--dot-distance": "75px" } as React.CSSProperties} />
            </div>

            <div className="relative z-10">
              <div className="text-4xl mb-3">&#127881;</div>
              <h3 className="text-xl font-bold text-white mb-1">
                {celebration.isLastWeek ? "Program Complete!" : `Week ${celebration.weekNumber} Complete!`}
              </h3>
              <p className="text-sm text-gray-400 mb-1">{celebration.weekTitle}</p>
              <p className="text-xs text-gray-500 mb-5">
                You completed {celebration.actionCount} actions
              </p>

              <button
                onClick={() => {
                  setCelebration(null);
                  if (!celebration.isLastWeek) {
                    // Scroll to next action after dismissing
                    setTimeout(() => scrollToNextAction(), 200);
                  }
                }}
                className="px-5 py-2.5 rounded-lg bg-neon-cyan/10 border border-neon-cyan/40 text-neon-cyan text-sm font-medium hover:bg-neon-cyan/20 transition"
              >
                {celebration.isLastWeek ? "View Your Journey" : `Continue to Week ${celebration.weekNumber + 1} \u2192`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating continue button (mobile) */}
      {showFloatingContinue && nextActionDetails && !celebration && (
        <div className="fixed bottom-0 left-0 right-0 z-40 sm:hidden">
          <div className="bg-surface-card/95 backdrop-blur-sm border-t border-surface-border px-4 py-3">
            <button
              onClick={scrollToNextAction}
              className="w-full flex items-center justify-between gap-3 px-4 py-2.5 rounded-lg bg-neon-cyan/10 border border-neon-cyan/30 hover:bg-neon-cyan/20 transition"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className={`text-xs uppercase font-bold ${ACTION_TYPE_COLORS[nextActionDetails.type] ?? "text-gray-400"}`}>
                  {nextActionDetails.type}
                </span>
                <span className="text-sm text-white truncate">
                  {nextActionDetails.title}
                </span>
              </div>
              <span className="text-sm text-neon-cyan font-medium flex-shrink-0">
                Continue &rarr;
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
