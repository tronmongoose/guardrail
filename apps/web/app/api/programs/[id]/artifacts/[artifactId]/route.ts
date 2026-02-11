import { NextRequest, NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; artifactId: string }> }
) {
  const { id: programId, artifactId } = await params;
  const user = await getOrCreateUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const program = await prisma.program.findUnique({
    where: { id: programId },
    select: { creatorId: true },
  });

  if (!program) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (program.creatorId !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.programArtifact.delete({
    where: { id: artifactId },
  });

  return NextResponse.json({ success: true });
}
