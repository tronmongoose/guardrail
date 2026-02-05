import { NextRequest, NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getOrCreateUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const program = await prisma.program.findUnique({ where: { id } });
  if (!program || program.creatorId !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // TODO: Create Stripe product + price when Stripe is configured
  const updated = await prisma.program.update({
    where: { id },
    data: { published: true },
  });

  return NextResponse.json(updated);
}
