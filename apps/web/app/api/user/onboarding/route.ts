import { NextRequest, NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest) {
  const user = await getOrCreateUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();

  const data: Record<string, unknown> = {};
  if (body.bio !== undefined) data.bio = body.bio;
  if (body.niche !== undefined) data.niche = body.niche;
  if (body.outcomeTarget !== undefined) data.outcomeTarget = body.outcomeTarget;
  if (body.name !== undefined) data.name = body.name;

  // Mark onboarding complete if all required fields provided
  if (body.niche && body.outcomeTarget) {
    data.onboardingComplete = true;
  }

  // Upgrade role to CREATOR when completing onboarding
  if (data.onboardingComplete) {
    data.role = "CREATOR";
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data,
  });

  return NextResponse.json(updated);
}

export async function GET() {
  const user = await getOrCreateUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    name: user.name,
    bio: user.bio,
    niche: user.niche,
    outcomeTarget: user.outcomeTarget,
    onboardingComplete: user.onboardingComplete,
  });
}
