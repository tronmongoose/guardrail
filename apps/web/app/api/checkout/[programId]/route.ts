import { NextRequest, NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ programId: string }> }
) {
  const { programId } = await params;
  const user = await getOrCreateUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const program = await prisma.program.findUnique({ where: { id: programId } });
  if (!program || !program.published) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Check if user already has access
  const existing = await prisma.entitlement.findUnique({
    where: { userId_programId: { userId: user.id, programId } },
  });
  if (existing?.status === "ACTIVE") {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    return NextResponse.redirect(`${appUrl}/learn/${programId}`, 303);
  }

  // For now, all programs are free - grant access directly
  await prisma.entitlement.upsert({
    where: { userId_programId: { userId: user.id, programId } },
    create: { userId: user.id, programId, status: "ACTIVE" },
    update: { status: "ACTIVE" },
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return NextResponse.redirect(`${appUrl}/learn/${programId}`, 303);
}
