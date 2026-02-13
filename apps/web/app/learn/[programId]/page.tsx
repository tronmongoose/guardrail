import { prisma } from "@/lib/prisma";
import { getCurrentUser, getEntitlement } from "@/lib/auth";
import { notFound, redirect } from "next/navigation";
import { LearnerTimeline } from "./timeline";

export default async function LearnPage({ params }: { params: Promise<{ programId: string }> }) {
  const { programId } = await params;

  // Use getCurrentUser which checks both Clerk (creator) and magic link (learner) sessions
  const user = await getCurrentUser();
  if (!user) redirect("/");

  // Fetch entitlement with week completions
  const entitlement = await getEntitlement(user.id, programId);

  if (!entitlement || entitlement.status !== "ACTIVE") {
    redirect("/");
  }

  const program = await prisma.program.findUnique({
    where: { id: programId },
    include: {
      weeks: {
        orderBy: { weekNumber: "asc" },
        include: {
          sessions: {
            orderBy: { orderIndex: "asc" },
            include: {
              actions: {
                orderBy: { orderIndex: "asc" },
                include: {
                  youtubeVideo: true,
                  progress: { where: { userId: user.id } },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!program || !program.published) notFound();

  // Calculate which week the learner currently has access to based on pacing mode
  const completedWeeks = entitlement.weekCompletions.map((wc) => wc.weekNumber);

  // For time-based pacing, calculate week based on enrollment time
  let currentWeek: number;
  if (program.pacingMode === "DRIP_BY_WEEK") {
    const enrolledAt = entitlement.createdAt;
    const now = new Date();
    const daysSinceEnrollment = Math.floor(
      (now.getTime() - enrolledAt.getTime()) / (1000 * 60 * 60 * 24)
    );
    // Week 1 is available immediately, week 2 after 7 days, etc.
    currentWeek = Math.min(
      Math.floor(daysSinceEnrollment / 7) + 1,
      program.durationWeeks
    );
  } else {
    // UNLOCK_ON_COMPLETE - use the stored currentWeek from entitlement
    currentWeek = entitlement.currentWeek;
  }

  return (
    <LearnerTimeline
      program={program}
      userId={user.id}
      enrolledAt={entitlement.createdAt.toISOString()}
      currentWeek={currentWeek}
      completedWeeks={completedWeeks}
      pacingMode={program.pacingMode}
    />
  );
}
