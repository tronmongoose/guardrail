import { NextRequest, NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: programId } = await params;
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

  const artifacts = await prisma.programArtifact.findMany({
    where: { programId },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ artifacts });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: programId } = await params;
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

  const body = await req.json();
  const { originalFilename, fileType, extractedText, metadata } = body;

  if (!originalFilename || !fileType) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const artifact = await prisma.programArtifact.create({
    data: {
      programId,
      originalFilename,
      fileType,
      extractedText,
      metadata,
    },
  });

  return NextResponse.json(artifact);
}
