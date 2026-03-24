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

  // Fetch current titles to know which ones are auto-generated ("Session N")
  const currentSessions = await prisma.session.findMany({
    where: { id: { in: sessionIds } },
    select: { id: true, title: true },
  });
  const titleMap = new Map(currentSessions.map((s) => [s.id, s.title]));
  const autoTitlePattern = /^Session\s+\d+$/i;

  // Update session order indices and auto-rename "Session N" titles to match new position
  await prisma.$transaction(
    sessionIds.map((sessionId, index) => {
      const currentTitle = titleMap.get(sessionId) ?? "";
      const data: { orderIndex: number; title?: string } = { orderIndex: index };
      if (autoTitlePattern.test(currentTitle)) {
        data.title = `Session ${index + 1}`;
      }
      return prisma.session.update({ where: { id: sessionId }, data });
    })
  );

  return NextResponse.json({ success: true });
}
