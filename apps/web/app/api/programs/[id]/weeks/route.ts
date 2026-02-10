import { NextRequest, NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Create a new week
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: programId } = await params;
  const user = await getOrCreateUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Verify ownership
  const program = await prisma.program.findUnique({
    where: { id: programId },
    select: { creatorId: true },
  });
  if (!program) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (program.creatorId !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { title, weekNumber } = body;

  // Get the next week number if not provided
  let finalWeekNumber = weekNumber;
  if (finalWeekNumber === undefined) {
    const lastWeek = await prisma.week.findFirst({
      where: { programId },
      orderBy: { weekNumber: "desc" },
    });
    finalWeekNumber = lastWeek ? lastWeek.weekNumber + 1 : 1;
  }

  const week = await prisma.week.create({
    data: {
      title: title || `Week ${finalWeekNumber}`,
      weekNumber: finalWeekNumber,
      programId,
    },
    include: {
      sessions: {
        orderBy: { orderIndex: "asc" },
        include: { actions: { orderBy: { orderIndex: "asc" } } },
      },
    },
  });

  return NextResponse.json(week, { status: 201 });
}
