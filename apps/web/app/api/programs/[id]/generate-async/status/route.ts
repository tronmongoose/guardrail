import { NextRequest, NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * Poll generation job status.
 * Returns current status, stage, progress, and any error.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: programId } = await params;

  const user = await getOrCreateUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Verify program ownership
  const program = await prisma.program.findUnique({
    where: { id: programId },
    select: { creatorId: true },
  });

  if (!program || program.creatorId !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Get most recent job for this program
  const job = await prisma.generationJob.findFirst({
    where: { programId },
    orderBy: { createdAt: "desc" },
  });

  if (!job) {
    return NextResponse.json({ error: "No generation job found" }, { status: 404 });
  }

  return NextResponse.json({
    jobId: job.id,
    status: job.status,
    stage: job.stage,
    progress: job.progress,
    error: job.error,
    startedAt: job.startedAt,
    completedAt: job.completedAt,
    createdAt: job.createdAt,
  });
}
