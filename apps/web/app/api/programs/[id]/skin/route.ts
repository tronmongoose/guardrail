import { NextRequest, NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateSkinFromVibe } from "@/lib/generate-skin";

/** POST /api/programs/[id]/skin — generate + save a custom skin for this program. */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: programId } = await params;

  const user = await getOrCreateUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const program = await prisma.program.findUnique({
    where: { id: programId },
    select: { id: true, creatorId: true, title: true, targetTransformation: true, vibePrompt: true },
  });
  if (!program || program.creatorId !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const tokens = await generateSkinFromVibe({
    title: program.title,
    targetTransformation: program.targetTransformation,
    vibePrompt: program.vibePrompt,
  });

  if (!tokens) {
    // LLM_PROVIDER=stub or parse failure
    return NextResponse.json({ customSkinId: null, tokens: null });
  }

  const customSkin = await prisma.customSkin.create({
    data: {
      creatorId: user.id,
      name: `${program.title} – AI Skin`,
      tokens: tokens as object,
    },
  });

  await prisma.program.update({
    where: { id: programId },
    data: { customSkinId: customSkin.id, skinId: "classic-minimal" },
  });

  return NextResponse.json({ customSkinId: customSkin.id, tokens });
}
