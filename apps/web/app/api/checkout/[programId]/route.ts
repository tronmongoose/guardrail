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

  // Free program: create entitlement directly
  if (program.priceInCents === 0) {
    await prisma.entitlement.upsert({
      where: { userId_programId: { userId: user.id, programId } },
      create: { userId: user.id, programId, status: "ACTIVE" },
      update: { status: "ACTIVE" },
    });
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    return NextResponse.redirect(new URL(`/learn/${programId}`, appUrl));
  }

  // TODO: Paid checkout via Stripe when configured
  return NextResponse.json(
    { error: "Paid checkout not configured yet" },
    { status: 501 }
  );
}
