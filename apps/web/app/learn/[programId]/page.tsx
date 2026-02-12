import { prisma } from "@/lib/prisma";
import { getOrCreateUser } from "@/lib/auth";
import { notFound, redirect } from "next/navigation";
import { LearnerTimeline } from "./timeline";

export default async function LearnPage({ params }: { params: Promise<{ programId: string }> }) {
  const { programId } = await params;
  const user = await getOrCreateUser();
  if (!user) redirect("/");

  // Fetch entitlement with createdAt (enrollment date)
  const entitlement = await prisma.entitlement.findUnique({
    where: { userId_programId: { userId: user.id, programId } },
  });

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

  return (
    <LearnerTimeline
      program={program}
      userId={user.id}
      enrolledAt={entitlement.createdAt.toISOString()}
    />
  );
}
