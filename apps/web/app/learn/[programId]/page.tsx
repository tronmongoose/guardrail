import { prisma } from "@/lib/prisma";
import { getOrCreateUser, hasEntitlement } from "@/lib/auth";
import { notFound, redirect } from "next/navigation";
import { LearnerTimeline } from "./timeline";

export default async function LearnPage({ params }: { params: Promise<{ programId: string }> }) {
  const { programId } = await params;
  const user = await getOrCreateUser();
  if (!user) redirect("/");

  const entitled = await hasEntitlement(user.id, programId);
  if (!entitled) redirect("/");

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

  return <LearnerTimeline program={program} userId={user.id} />;
}
