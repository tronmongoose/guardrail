import { NextRequest, NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getStripe, isStripeConfigured } from "@/lib/stripe";

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

  // Check if user already has access
  const existing = await prisma.entitlement.findUnique({
    where: { userId_programId: { userId: user.id, programId } },
  });
  if (existing?.status === "ACTIVE") {
    // Already enrolled - return learn URL for client to navigate
    return NextResponse.json({
      enrolled: true,
      learnUrl: `/learn/${programId}`
    });
  }

  // Free program - grant access directly
  if (program.priceInCents === 0) {
    await prisma.entitlement.upsert({
      where: { userId_programId: { userId: user.id, programId } },
      create: { userId: user.id, programId, status: "ACTIVE" },
      update: { status: "ACTIVE" },
    });
    return NextResponse.json({
      enrolled: true,
      learnUrl: `/learn/${programId}`
    });
  }

  // Paid program - create Stripe checkout session
  if (!isStripeConfigured()) {
    return NextResponse.json(
      { error: "Payments not configured" },
      { status: 503 }
    );
  }

  if (!program.stripePriceId) {
    return NextResponse.json(
      { error: "Program not set up for payments" },
      { status: 400 }
    );
  }

  const stripe = getStripe();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    line_items: [
      {
        price: program.stripePriceId,
        quantity: 1,
      },
    ],
    success_url: `${appUrl}/learn/${programId}?checkout=success`,
    cancel_url: `${appUrl}/p/${program.slug}?checkout=cancelled`,
    metadata: {
      userId: user.id,
      programId: program.id,
    },
    customer_email: user.email,
  });

  return NextResponse.json({ checkoutUrl: session.url });
}
