import { NextRequest, NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Create a new session
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; weekId: string }> }
) {
  const { id: programId, weekId } = await params;
  const user = await getOrCreateUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Verify ownership
  const week = await prisma.week.findUnique({
    where: { id: weekId },
    include: { program: { select: { creatorId: true } } },
  });
  if (!week) return NextResponse.json({ error: "Week not found" }, { status: 404 });
  if (week.program.creatorId !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (week.programId !== programId) {
    return NextResponse.json({ error: "Week does not belong to program" }, { status: 400 });
  }

  const body = await req.json();
  const { title } = body;

  // Get the next order index
  const lastSession = await prisma.session.findFirst({
    where: { weekId },
    orderBy: { orderIndex: "desc" },
  });
  const orderIndex = lastSession ? lastSession.orderIndex + 1 : 0;

  const session = await prisma.session.create({
    data: {
      title: title || `Session ${orderIndex + 1}`,
      orderIndex,
      weekId,
    },
    include: {
      actions: { orderBy: { orderIndex: "asc" } },
    },
  });

  return NextResponse.json(session, { status: 201 });
}
