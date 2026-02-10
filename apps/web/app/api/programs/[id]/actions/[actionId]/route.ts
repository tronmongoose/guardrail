import { NextRequest, NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Update an action
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; actionId: string }> }
) {
  const { id: programId, actionId } = await params;
  const user = await getOrCreateUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Verify ownership
  const action = await prisma.action.findUnique({
    where: { id: actionId },
    include: {
      session: {
        include: {
          week: {
            include: { program: { select: { creatorId: true, id: true } } },
          },
        },
      },
    },
  });
  if (!action) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (action.session.week.program.creatorId !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (action.session.week.program.id !== programId) {
    return NextResponse.json({ error: "Action does not belong to program" }, { status: 400 });
  }

  const body = await req.json();
  const data: Record<string, unknown> = {};
  if (body.title !== undefined) data.title = body.title;
  if (body.type !== undefined) {
    if (!["WATCH", "READ", "DO", "REFLECT"].includes(body.type)) {
      return NextResponse.json({ error: "Invalid action type" }, { status: 400 });
    }
    data.type = body.type;
  }
  if (body.instructions !== undefined) data.instructions = body.instructions;
  if (body.reflectionPrompt !== undefined) data.reflectionPrompt = body.reflectionPrompt;
  if (body.youtubeVideoId !== undefined) data.youtubeVideoId = body.youtubeVideoId;

  const updated = await prisma.action.update({
    where: { id: actionId },
    data,
  });

  return NextResponse.json(updated);
}

// Delete an action
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; actionId: string }> }
) {
  const { id: programId, actionId } = await params;
  const user = await getOrCreateUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Verify ownership
  const action = await prisma.action.findUnique({
    where: { id: actionId },
    include: {
      session: {
        include: {
          week: {
            include: { program: { select: { creatorId: true, id: true } } },
          },
        },
      },
    },
  });
  if (!action) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (action.session.week.program.creatorId !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (action.session.week.program.id !== programId) {
    return NextResponse.json({ error: "Action does not belong to program" }, { status: 400 });
  }

  await prisma.action.delete({ where: { id: actionId } });

  return NextResponse.json({ success: true });
}
