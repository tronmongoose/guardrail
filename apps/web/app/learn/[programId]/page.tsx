import { prisma } from "@/lib/prisma";
import { getCurrentUser, getEntitlement } from "@/lib/auth";
import { notFound, redirect } from "next/navigation";
import { LearnerTimeline } from "./timeline";
import { getSkinTokens } from "@/lib/skin-bundles/registry";
import { getTokenCSSVars } from "@/lib/skin-bridge";
import { SkinThemeProvider } from "@/components/skins/SkinThemeProvider";

export default async function LearnPage({ params }: { params: Promise<{ programId: string }> }) {
  const { programId } = await params;

  const user = await getCurrentUser();
  if (!user) redirect("/");

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

  if (!program) notFound();

  // Creators can always view their own program (even unpublished)
  const isCreator = program.creatorId === user.id;

  let currentWeek: number;
  let completedWeeks: number[];
  let enrolledAt: string;

  if (isCreator) {
    // Creators see all weeks unlocked
    currentWeek = program.durationWeeks;
    completedWeeks = [];
    enrolledAt = program.createdAt.toISOString();
  } else {
    if (!program.published) notFound();

    const entitlement = await getEntitlement(user.id, programId);
    if (!entitlement || entitlement.status !== "ACTIVE") {
      redirect("/");
    }

    completedWeeks = entitlement.weekCompletions.map((wc) => wc.weekNumber);
    enrolledAt = entitlement.createdAt.toISOString();

    if (program.pacingMode === "DRIP_BY_WEEK") {
      const now = new Date();
      const daysSinceEnrollment = Math.floor(
        (now.getTime() - entitlement.createdAt.getTime()) / (1000 * 60 * 60 * 24)
      );
      currentWeek = Math.min(
        Math.floor(daysSinceEnrollment / 7) + 1,
        program.durationWeeks
      );
    } else {
      currentWeek = entitlement.currentWeek;
    }
  }

  const tokens = getSkinTokens(program.skinId);
  const skinCSSVars = getTokenCSSVars(tokens);

  return (
    <SkinThemeProvider tokens={tokens}>
      <LearnerTimeline
        program={program}
        userId={user.id}
        enrolledAt={enrolledAt}
        currentWeek={currentWeek}
        completedWeeks={completedWeeks}
        pacingMode={program.pacingMode}
        skinId={program.skinId}
        skinCSSVars={skinCSSVars}
      />
    </SkinThemeProvider>
  );
}
