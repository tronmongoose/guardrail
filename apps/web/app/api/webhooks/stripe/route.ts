import { NextResponse } from "next/server";

// Stripe webhook — disabled for initial deploy
export async function POST() {
  return NextResponse.json(
    { error: "Stripe webhooks not configured yet" },
    { status: 501 }
  );
}
