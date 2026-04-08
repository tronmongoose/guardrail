import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";

const ALLOWED_EMAILS = ["info@skillguide.net"];

export async function GET() {
  const user = await currentUser();
  const email = user?.emailAddresses[0]?.emailAddress;
  const hasAccess = !!email && ALLOWED_EMAILS.includes(email);
  return NextResponse.json({ hasAccess });
}
