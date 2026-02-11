import { NextRequest, NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getOrCreateUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const influencer = await prisma.influencer.findUnique({
    where: { id },
    include: {
      _count: {
        select: { followers: true },
      },
    },
  });

  if (!influencer) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Check if current user follows
  const isFollowing = await prisma.userInfluencer.findUnique({
    where: {
      userId_influencerId: {
        userId: user.id,
        influencerId: id,
      },
    },
  });

  return NextResponse.json({
    ...influencer,
    followerCount: influencer._count.followers,
    isFollowing: !!isFollowing,
  });
}
