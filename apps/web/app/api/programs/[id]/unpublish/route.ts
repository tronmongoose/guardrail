import { NextRequest, NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getOrCreateUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const program = await prisma.program.findUnique({
    where: { id },
    select: { creatorId: true, published: true },
  });

  if (!program || program.creatorId !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!program.published) {
    return NextResponse.json({ error: "Program is not published" }, { status: 400 });
  }

  await prisma.program.update({
    where: { id },
    data: { published: false },
  });

  logger.info({
    operation: "program.unpublish.success",
    programId: id,
  });

  return NextResponse.json({ success: true });
}
