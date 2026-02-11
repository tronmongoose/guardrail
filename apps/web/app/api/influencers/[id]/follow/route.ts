import { NextRequest, NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: influencerId } = await params;
  const user = await getOrCreateUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Check influencer exists
  const influencer = await prisma.influencer.findUnique({
    where: { id: influencerId },
  });

  if (!influencer) {
    return NextResponse.json({ error: "Influencer not found" }, { status: 404 });
  }

  // Check if already following
  const existing = await prisma.userInfluencer.findUnique({
    where: {
      userId_influencerId: {
        userId: user.id,
        influencerId,
      },
    },
  });

  if (existing) {
    return NextResponse.json({ success: true, message: "Already following" });
  }

  await prisma.userInfluencer.create({
    data: {
      userId: user.id,
      influencerId,
    },
  });

  return NextResponse.json({ success: true });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: influencerId } = await params;
  const user = await getOrCreateUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await prisma.userInfluencer.deleteMany({
    where: {
      userId: user.id,
      influencerId,
    },
  });

  return NextResponse.json({ success: true });
}
