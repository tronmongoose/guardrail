import { NextRequest, NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slug";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getOrCreateUser();
  if (!user) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401, headers: { "Cache-Control": "no-store" } }
    );
  }

  const program = await prisma.program.findUnique({
    where: { id },
    include: {
      videos: { orderBy: { createdAt: "asc" } },
      drafts: { orderBy: { createdAt: "desc" }, take: 5 },
      weeks: {
        orderBy: { weekNumber: "asc" },
        include: {
          sessions: {
            orderBy: { orderIndex: "asc" },
            include: { actions: { orderBy: { orderIndex: "asc" } } },
          },
        },
      },
    },
  });
  if (!program) {
    return NextResponse.json(
      { error: "Not found" },
      {
        status: 404,
        headers: { "Cache-Control": "no-store" }
      }
    );
  }

  // Verify ownership
  if (program.creatorId !== user.id) {
    return NextResponse.json(
      { error: "Forbidden" },
      { status: 403, headers: { "Cache-Control": "no-store" } }
    );
  }

  return NextResponse.json(program, {
    headers: { "Cache-Control": "no-store, max-age=0" }
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getOrCreateUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Verify ownership before allowing update
  const existing = await prisma.program.findUnique({
    where: { id },
    select: { creatorId: true }
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (existing.creatorId !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const data: Record<string, unknown> = {};
  if (body.title) {
    data.title = body.title;
    data.slug = slugify(body.title) + "-" + id.slice(0, 6);
  }
  if (body.description !== undefined) data.description = body.description;
  if (body.durationWeeks) data.durationWeeks = body.durationWeeks;
  if (body.priceInCents !== undefined) data.priceInCents = body.priceInCents;

  const program = await prisma.program.update({ where: { id }, data });
  return NextResponse.json(program);
}
