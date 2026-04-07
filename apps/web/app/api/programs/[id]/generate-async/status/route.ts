import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

/**
 * Poll generation job status.
 * Uses lightweight auth (no user upsert) and a single query for speed.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: programId } = await params;

  const { userId: clerkId } = await auth();
  if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Single query: fetch the latest job and verify ownership via a join
  const job = await prisma.generationJob.findFirst({
    where: {
      programId,
      program: { creator: { clerkId } },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!job) {
    return NextResponse.json({ error: "No generation job found" }, { status: 404 });
  }

  // Detect stuck jobs
  const STALE_THRESHOLD_MS = 5 * 60 * 1000;
  let isStale = false;

  if (job.status === "PENDING" || job.status === "PROCESSING") {
    const lastActivity = job.updatedAt ?? job.createdAt;
    isStale = Date.now() - lastActivity.getTime() > STALE_THRESHOLD_MS;
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
    isStale,
  });
}
