import { NextRequest, NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slug";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
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
  if (!program) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(program);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getOrCreateUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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
