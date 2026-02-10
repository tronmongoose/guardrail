import { NextRequest, NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Create a new action
export async function POST(
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
  if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });
  if (session.week.program.creatorId !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (session.week.program.id !== programId) {
    return NextResponse.json({ error: "Session does not belong to program" }, { status: 400 });
  }

  const body = await req.json();
  const { title, type } = body;

  if (!type || !["WATCH", "READ", "DO", "REFLECT"].includes(type)) {
    return NextResponse.json({ error: "Invalid action type" }, { status: 400 });
  }

  // Get the next order index
  const lastAction = await prisma.action.findFirst({
    where: { sessionId },
    orderBy: { orderIndex: "desc" },
  });
  const orderIndex = lastAction ? lastAction.orderIndex + 1 : 0;

  const action = await prisma.action.create({
    data: {
      title: title || `New ${type.toLowerCase()} action`,
      type,
      orderIndex,
      sessionId,
    },
  });

  return NextResponse.json(action, { status: 201 });
}
