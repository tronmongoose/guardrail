import { NextRequest, NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ programId: string }> }
) {
  const { programId } = await params;
  const user = await getOrCreateUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const program = await prisma.program.findUnique({ where: { id: programId } });
  if (!program || !program.published) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Free program: create entitlement directly
  if (program.priceInCents === 0) {
    await prisma.entitlement.upsert({
      where: { userId_programId: { userId: user.id, programId } },
      create: { userId: user.id, programId, status: "ACTIVE" },
      update: { status: "ACTIVE" },
    });
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    return NextResponse.redirect(new URL(`/learn/${programId}`, appUrl));
  }

  // Paid: create Stripe Checkout Session
  if (!program.stripePriceId) {
    return NextResponse.json({ error: "No price configured" }, { status: 400 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [{ price: program.stripePriceId, quantity: 1 }],
    success_url: `${appUrl}/learn/${programId}?checkout=success`,
    cancel_url: `${appUrl}/p/${program.slug}`,
    metadata: {
      userId: user.id,
      programId: program.id,
    },
  });

  return NextResponse.redirect(session.url!);
}
