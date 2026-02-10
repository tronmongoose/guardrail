import { NextRequest, NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Reorder sessions within a week
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; weekId: string }> }
) {
  const { id: programId, weekId } = await params;
  const user = await getOrCreateUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Verify ownership
  const week = await prisma.week.findUnique({
    where: { id: weekId },
    include: { program: { select: { creatorId: true, id: true } } },
  });
  if (!week) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (week.program.creatorId !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (week.program.id !== programId) {
    return NextResponse.json({ error: "Week does not belong to program" }, { status: 400 });
  }

  const body = await req.json();
  const { sessionIds } = body as { sessionIds: string[] };

  if (!Array.isArray(sessionIds)) {
    return NextResponse.json({ error: "sessionIds must be an array" }, { status: 400 });
  }

  // Update session order indices
  await prisma.$transaction(
    sessionIds.map((sessionId, index) =>
      prisma.session.update({
        where: { id: sessionId },
        data: { orderIndex: index },
      })
    )
  );

  return NextResponse.json({ success: true });
}
