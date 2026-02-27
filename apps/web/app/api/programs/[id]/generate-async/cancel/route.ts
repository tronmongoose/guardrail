import { NextRequest, NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/programs/[id]/generate-async/cancel
 * Cancels a stuck or in-progress generation job.
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: programId } = await params;

  const user = await getOrCreateUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const program = await prisma.program.findUnique({
    where: { id: programId },
    select: { creatorId: true },
  });

  if (!program || program.creatorId !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const activeJob = await prisma.generationJob.findFirst({
    where: {
      programId,
      status: { in: ["PENDING", "PROCESSING"] },
    },
  });

  if (!activeJob) {
    return NextResponse.json({ message: "No active job to cancel" });
  }

  await prisma.generationJob.update({
    where: { id: activeJob.id },
    data: {
      status: "FAILED",
      error: "Cancelled by user",
      completedAt: new Date(),
    },
  });

  return NextResponse.json({
    message: "Generation cancelled",
    jobId: activeJob.id,
  });
}
