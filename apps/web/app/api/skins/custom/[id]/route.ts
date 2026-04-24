import { NextRequest, NextResponse } from "next/server";
import type { SkinTokens } from "@guide-rail/shared";
import { getOrCreateUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { deepMerge } from "@/lib/generate-skin";

/** PATCH /api/skins/custom/[id] — deep-merge a partial tokens update onto the stored blob. */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const user = await getOrCreateUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const skin = await prisma.customSkin.findUnique({ where: { id } });
  if (!skin) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (skin.creatorId !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: { tokens?: Partial<SkinTokens>; name?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const current = skin.tokens as unknown as SkinTokens;
  const merged = body.tokens ? deepMerge(current, body.tokens) : current;

  const updated = await prisma.customSkin.update({
    where: { id },
    data: {
      tokens: merged as object,
      ...(body.name ? { name: body.name } : {}),
    },
    select: { id: true, name: true, tokens: true, createdAt: true },
  });

  return NextResponse.json(updated);
}
