import { NextRequest, NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** List the current creator's custom skins. */
export async function GET(_req: NextRequest) {
  const user = await getOrCreateUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const skins = await prisma.customSkin.findMany({
    where: { creatorId: user.id },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, tokens: true, createdAt: true },
  });

  return NextResponse.json(skins);
}

/** Delete a custom skin the creator owns. */
export async function DELETE(req: NextRequest) {
  const user = await getOrCreateUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const skin = await prisma.customSkin.findUnique({ where: { id } });
  if (!skin) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (skin.creatorId !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Clear customSkinId on any programs using this skin before deleting
  await prisma.program.updateMany({
    where: { customSkinId: id },
    data: { customSkinId: null },
  });

  await prisma.customSkin.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
