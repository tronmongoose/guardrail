import { NextResponse } from "next/server";

export async function POST() {
  // Stripe disabled
  return NextResponse.json({ error: "Stripe not configured" }, { status: 501 });
}
