import { NextRequest, NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Update a week
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
    include: { program: { select: { creatorId: true } } },
  });
  if (!week) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (week.program.creatorId !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (week.programId !== programId) {
    return NextResponse.json({ error: "Week does not belong to program" }, { status: 400 });
  }

  const body = await req.json();
  const data: Record<string, unknown> = {};
  if (body.title !== undefined) data.title = body.title;
  if (body.summary !== undefined) data.summary = body.summary;

  const updated = await prisma.week.update({
    where: { id: weekId },
    data,
    include: {
      sessions: {
        orderBy: { orderIndex: "asc" },
        include: { actions: { orderBy: { orderIndex: "asc" } } },
      },
    },
  });

  return NextResponse.json(updated);
}

// Delete a week
export async function DELETE(
  _req: NextRequest,
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
  if (!week) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (week.program.creatorId !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (week.programId !== programId) {
    return NextResponse.json({ error: "Week does not belong to program" }, { status: 400 });
  }

  await prisma.week.delete({ where: { id: weekId } });

  return NextResponse.json({ success: true });
}
