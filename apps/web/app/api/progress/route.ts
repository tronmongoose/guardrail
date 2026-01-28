import { NextRequest, NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const user = await getOrCreateUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { actionId, reflectionText } = await req.json();

  const progress = await prisma.learnerProgress.upsert({
    where: { userId_actionId: { userId: user.id, actionId } },
    create: {
      userId: user.id,
      actionId,
      completed: true,
      completedAt: new Date(),
      reflectionText: reflectionText || null,
    },
    update: {
      completed: true,
      completedAt: new Date(),
      reflectionText: reflectionText || undefined,
    },
  });

  return NextResponse.json(progress);
}
