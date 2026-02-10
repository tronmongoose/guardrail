import { NextRequest, NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Reorder actions within a session
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; sessionId: string }> }
) {
  const { id: programId, sessionId } = await params;
  const user = await getOrCreateUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Verify ownership
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: { week: { include: { program: { select: { creatorId: true, id: true } } } } },
  });
  if (!session) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (session.week.program.creatorId !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (session.week.program.id !== programId) {
    return NextResponse.json({ error: "Session does not belong to program" }, { status: 400 });
  }

  const body = await req.json();
  const { actionIds } = body as { actionIds: string[] };

  if (!Array.isArray(actionIds)) {
    return NextResponse.json({ error: "actionIds must be an array" }, { status: 400 });
  }

  // Update action order indices
  await prisma.$transaction(
    actionIds.map((actionId, index) =>
      prisma.action.update({
        where: { id: actionId },
        data: { orderIndex: index },
      })
    )
  );

  return NextResponse.json({ success: true });
}
