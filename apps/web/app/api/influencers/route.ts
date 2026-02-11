import { NextRequest, NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const user = await getOrCreateUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const query = searchParams.get("q");
  const platform = searchParams.get("platform");
  const niche = searchParams.get("niche");

  const where: {
    name?: { contains: string; mode: "insensitive" };
    platform?: string;
    niche?: string;
  } = {};

  if (query) {
    where.name = { contains: query, mode: "insensitive" };
  }
  if (platform) {
    where.platform = platform;
  }
  if (niche) {
    where.niche = niche;
  }

  const influencers = await prisma.influencer.findMany({
    where,
    orderBy: { name: "asc" },
    take: 50,
  });

  return NextResponse.json({ influencers });
}
