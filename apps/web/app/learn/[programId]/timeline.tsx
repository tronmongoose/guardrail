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
  skinId: string;
  skinCSSVars: Record<string, string>;
}

const ACTION_TYPE_COLORS: Record<string, string> = {
  WATCH: "text-neon-cyan",
  REFLECT: "text-neon-pink",
  DO: "text-neon-yellow",
  READ: "text-neon-cyan",
};

const ACTION_TYPE_BG: Record<string, string> = {
  WATCH: "bg-neon-cyan/10 border-neon-cyan/30",
  REFLECT: "bg-neon-pink/10 border-neon-pink/30",
  DO: "bg-neon-yellow/10 border-neon-yellow/30",
  READ: "bg-neon-cyan/10 border-neon-cyan/30",
};

const ACTION_TYPE_VERBS: Record<string, string> = {
  WATCH: "Watch",
  READ: "Read",
  DO: "Practice",
  REFLECT: "Reflect",
};

export function LearnerTimeline({
  program,
  userId,
  enrolledAt,
  currentWeek,
  completedWeeks,
  pacingMode,
  skinId,
  skinCSSVars,
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
  const [justCompleted, setJustCompleted] = useState<string | null>(null);

  // Track which action is expanded (for mobile detail view)
  const [expandedAction, setExpandedAction] = useState<string | null>(null);

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
      setTimeout(() => {
        nextActionRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 300);
    }
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

      // Trigger completion animation
      setJustCompleted(actionId);
      setTimeout(() => setJustCompleted(null), 1000);

      setCompletedActions((prev) => new Set(prev).add(actionId));
      setExpandedAction(null);

      if (data.weekCompleted) {
        setCompletedWeeksState((prev) => new Set(prev).add(weekNumber));

        const week = program.weeks.find((w) => w.weekNumber === weekNumber);
        const weekActionCount = week?.sessions.flatMap((s) => s.actions).length ?? 0;
        const isLastWeek = weekNumber === program.weeks.length;

        setCelebration({
          weekNumber,
          weekTitle: week?.title ?? `Week ${weekNumber}`,
          actionCount: weekActionCount,
          isLastWeek,
        });

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

  // SVG arc for progress circle
  const progressArc = useMemo(() => {
    const r = 18;
    const circ = 2 * Math.PI * r;
    const offset = circ - (progressPercent / 100) * circ;
    return { r, circ, offset };
  }, [progressPercent]);

  return (
    <div className="min-h-screen bg-[#0a0a0f]" data-skin={skinId} style={skinCSSVars as React.CSSProperties}>
      {/* Fixed top bar */}
      <nav className="sticky top-0 z-30 bg-surface-dark/95 backdrop-blur-sm border-b border-surface-border">
        <div className="flex items-center justify-between px-4 py-3 max-w-xl mx-auto">
          <Link href="/" className="text-neon-cyan text-sm font-bold">&larr;</Link>
          <div className="flex-1 text-center px-4">
            <h1 className="text-sm font-semibold text-white truncate">{program.title}</h1>
          </div>
          {/* Progress circle */}
          <div className="relative w-10 h-10 flex-shrink-0">
            <svg className="w-10 h-10 -rotate-90" viewBox="0 0 40 40">
              <circle cx="20" cy="20" r={progressArc.r} fill="none" stroke="#1f2937" strokeWidth="3" />
              <circle
                cx="20" cy="20" r={progressArc.r}
                fill="none" stroke="url(#progressGrad)" strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray={progressArc.circ}
                strokeDashoffset={progressArc.offset}
                className="transition-all duration-700"
              />
              <defs>
                <linearGradient id="progressGrad">
                  <stop offset="0%" stopColor="#00fff0" />
                  <stop offset="100%" stopColor="#ff2dff" />
                </linearGradient>
              </defs>
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-white">
              {progressPercent}%
            </span>
          </div>
        </div>
      </nav>

      <main className="max-w-xl mx-auto px-4 py-6 pb-24 space-y-4">
        {/* Progress summary */}
        <div className="text-center mb-2">
          <p className="text-xs text-gray-500">
            {completedCount} of {totalActions} actions complete
            {isProgramComplete && " — You did it!"}
          </p>
        </div>

        {/* Week sections */}
        {program.weeks.map((week) => {
          const isUnlocked = week.weekNumber <= unlockedWeekNumber;
          const weekActions = week.sessions.flatMap((s) => s.actions);
          const weekCompletedCount = weekActions.filter((a) => completedActions.has(a.id)).length;
          const isWeekComplete = weekActions.length > 0 && weekCompletedCount === weekActions.length;
          const weekProgress = weekActions.length > 0 ? Math.round((weekCompletedCount / weekActions.length) * 100) : 0;

          return (
            <section key={week.id}>
              {/* Week header */}
              <div className="flex items-center gap-3 mb-3">
                <span
                  className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${
                    isWeekComplete
                      ? "bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/30"
                      : isUnlocked
                      ? "bg-surface-card text-gray-400 border border-surface-border"
                      : "bg-surface-dark text-gray-600"
                  }`}
                >
                  W{week.weekNumber}
                </span>
                <h2 className={`text-sm font-semibold ${isUnlocked ? "text-white" : "text-gray-600"}`}>
                  {week.title}
                </h2>
                {isUnlocked && weekActions.length > 0 && (
                  <span className="ml-auto text-xs text-gray-500">
                    {weekCompletedCount}/{weekActions.length}
                  </span>
                )}
                {isWeekComplete && (
                  <svg className="w-4 h-4 text-neon-cyan ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>

              {/* Week progress bar */}
              {isUnlocked && weekActions.length > 0 && (
                <div className="h-1 bg-surface-dark rounded-full overflow-hidden mb-3">
                  <div
                    className="h-full bg-gradient-to-r from-neon-cyan to-neon-pink transition-all duration-500"
                    style={{ width: `${weekProgress}%` }}
                  />
                </div>
              )}

              {/* Locked state */}
              {!isUnlocked && (
                <div className="py-6 text-center rounded-xl bg-surface-dark/50 border border-surface-border mb-4">
                  <svg className="w-8 h-8 text-gray-600 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <p className="text-xs text-gray-500">
                    {pacingMode === "UNLOCK_ON_COMPLETE" ? (
                      <>Complete Week {week.weekNumber - 1} to unlock</>
                    ) : (
                      <>
                        Unlocks in{" "}
                        {(() => {
                          const enrolled = new Date(enrolledAt);
                          const unlockDate = new Date(enrolled.getTime() + (week.weekNumber - 1) * 7 * 24 * 60 * 60 * 1000);
                          const daysUntil = Math.max(1, Math.ceil((unlockDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
                          return daysUntil === 1 ? "1 day" : `${daysUntil} days`;
                        })()}
                      </>
                    )}
                  </p>
                </div>
              )}

              {/* Sessions + actions */}
              {isUnlocked && week.sessions.map((session) => {
                const sessionActions = session.actions;
                const sessionDone = sessionActions.filter((a) => completedActions.has(a.id)).length;

                return (
                  <div key={session.id} className="mb-4">
                    {/* Session sub-header */}
                    {week.sessions.length > 1 && (
                      <div className="flex items-center justify-between mb-2 px-1">
                        <h3 className="text-xs font-medium text-gray-400">{session.title}</h3>
                        <span className="text-[10px] text-gray-600">{sessionDone}/{sessionActions.length}</span>
                      </div>
                    )}

                    <div className="space-y-2">
                      {session.actions.map((action) => {
                        const done = completedActions.has(action.id);
                        const isNext = action.id === nextActionId;
                        const isExpanded = expandedAction === action.id;
                        const isCompleting = justCompleted === action.id;
                        const isSaving = savingAction === action.id;

                        return (
                          <div
                            key={action.id}
                            ref={isNext ? nextActionRef : undefined}
                            className={`rounded-xl border transition-all duration-300 overflow-hidden ${
                              isNext && !isExpanded
                                ? "border-neon-cyan/50 shadow-lg shadow-neon-cyan/10 pulse-ring-border"
                                : isCompleting
                                ? "border-neon-cyan/50 scale-[0.98]"
                                : done
                                ? "border-surface-border/50 opacity-70"
                                : "border-surface-border"
                            }`}
                            style={{ backgroundColor: done ? "#0a0a0f" : "#111118" }}
                          >
                            {/* Compact action row */}
                            <div
                              role="button"
                              tabIndex={0}
                              onClick={() => {
                                if (!done) setExpandedAction(isExpanded ? null : action.id);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                  e.preventDefault();
                                  if (!done) setExpandedAction(isExpanded ? null : action.id);
                                }
                              }}
                              className="w-full flex items-center gap-3 p-3 text-left cursor-pointer"
                            >
                              {/* Completion circle */}
                              <button
                                type="button"
                                aria-label={done ? "Completed" : "Mark complete"}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (!done && !isSaving) {
                                    completeAction(action.id, week.weekNumber, reflections[action.id]);
                                  }
                                }}
                                className={`w-6 h-6 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all duration-300 ${
                                  done
                                    ? "bg-neon-cyan border-neon-cyan action-complete-check"
                                    : isSaving
                                    ? "border-neon-cyan animate-pulse"
                                    : "border-gray-600 hover:border-neon-cyan"
                                }`}
                              >
                                {isSaving ? (
                                  <Spinner size="sm" />
                                ) : done ? (
                                  <svg className="w-3 h-3 text-surface-dark" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                ) : null}
                              </button>

                              {/* Action info */}
                              <div className="flex-1 min-w-0">
                                <p className={`text-sm font-medium truncate ${done ? "line-through text-gray-500" : "text-white"}`}>
                                  {action.title}
                                </p>
                                <span className={`text-[10px] uppercase tracking-wider font-semibold ${ACTION_TYPE_COLORS[action.type] ?? "text-gray-400"}`}>
                                  {ACTION_TYPE_VERBS[action.type] || action.type}
                                </span>
                              </div>

                              {/* Up Next badge */}
                              {isNext && !isExpanded && (
                                <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-neon-cyan/15 text-neon-cyan border border-neon-cyan/30 flex-shrink-0">
                                  Next
                                </span>
                              )}

                              {/* Expand chevron */}
                              {!done && (
                                <svg
                                  className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
                                  fill="none" stroke="currentColor" viewBox="0 0 24 24"
                                >
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                              )}
                            </div>

                            {/* Expanded detail card */}
                            {isExpanded && !done && (
                              <div className="px-3 pb-4 pt-1 space-y-3 animate-fade-in">
                                {/* Instructions */}
                                {action.instructions && (
                                  <p className="text-xs text-gray-400 leading-relaxed px-1">
                                    {action.instructions}
                                  </p>
                                )}

                                {/* YouTube embed */}
                                {action.youtubeVideo && (
                                  <div className="aspect-video rounded-lg overflow-hidden border border-surface-border">
                                    <iframe
                                      src={`https://www.youtube.com/embed/${action.youtubeVideo.videoId}`}
                                      title={action.youtubeVideo.title || action.title}
                                      className="w-full h-full"
                                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                      allowFullScreen
                                    />
                                  </div>
                                )}

                                {/* Reflection prompt */}
                                {action.type === "REFLECT" && action.reflectionPrompt && (
                                  <div>
                                    <p className="text-xs text-neon-pink/80 italic mb-2 px-1">
                                      {action.reflectionPrompt}
                                    </p>
                                    <textarea
                                      value={reflections[action.id] ?? ""}
                                      onChange={(e) =>
                                        setReflections((r) => ({ ...r, [action.id]: e.target.value }))
                                      }
                                      placeholder="Write your reflection..."
                                      rows={3}
                                      className="w-full px-3 py-2 bg-surface-dark border border-surface-border rounded-lg text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-neon-pink focus:ring-1 focus:ring-neon-pink resize-none"
                                    />
                                  </div>
                                )}

                                {/* Complete action button */}
                                <button
                                  onClick={() => completeAction(action.id, week.weekNumber, reflections[action.id])}
                                  disabled={isSaving}
                                  className={`w-full py-2.5 rounded-lg text-sm font-semibold transition border ${
                                    ACTION_TYPE_BG[action.type] || "bg-gray-600/10 border-gray-600/30"
                                  } ${ACTION_TYPE_COLORS[action.type] || "text-gray-400"} hover:opacity-80 disabled:opacity-50`}
                                >
                                  {isSaving ? "Saving..." : "Mark Complete"}
                                </button>
                              </div>
                            )}
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
      {nextActionId && !expandedAction && !celebration && !isProgramComplete && (
        <div className="fixed bottom-0 left-0 right-0 z-40 sm:hidden">
          <div className="bg-surface-card/95 backdrop-blur-sm border-t border-surface-border px-4 py-3">
            <button
              onClick={scrollToNextAction}
              className="w-full py-2.5 rounded-lg bg-neon-cyan/10 border border-neon-cyan/30 hover:bg-neon-cyan/20 transition text-sm text-neon-cyan font-medium"
            >
              Continue &rarr;
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
