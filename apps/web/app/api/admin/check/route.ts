import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

function getAdminIds(): Set<string> {
  const raw = process.env.ADMIN_USER_IDS ?? "";
  return new Set(
    raw
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean)
  );
}

export async function GET() {
  const { userId } = await auth();
  const isAdmin = !!userId && getAdminIds().has(userId);
  return NextResponse.json({ isAdmin });
}
