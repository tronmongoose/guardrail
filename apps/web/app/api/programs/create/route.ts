import { NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slug";

export async function POST() {
  const user = await getOrCreateUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const program = await prisma.program.create({
    data: {
      title: "Untitled Program",
      slug: slugify("untitled-" + Date.now()),
      durationWeeks: 6,
      creatorId: user.id,
    },
  });

  // Use request URL as base for redirect to avoid env var issues
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  // Use 303 See Other to ensure browser makes a GET request to the edit page
  // (default 308 preserves POST method which causes issues)
  return NextResponse.redirect(`${baseUrl}/programs/${program.id}/edit`, 303);
}
