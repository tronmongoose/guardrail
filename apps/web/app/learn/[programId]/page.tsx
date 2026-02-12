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

  // Calculate which week the learner currently has access to
  const completedWeeks = entitlement.weekCompletions.map((wc) => wc.weekNumber);
  const currentWeek = entitlement.currentWeek;

  return (
    <LearnerTimeline
      program={program}
      userId={user.id}
      enrolledAt={entitlement.createdAt.toISOString()}
      currentWeek={currentWeek}
      completedWeeks={completedWeeks}
    />
  );
}
