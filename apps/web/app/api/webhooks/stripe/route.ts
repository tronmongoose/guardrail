import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import Stripe from "stripe";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig) return NextResponse.json({ error: "No signature" }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error("Webhook signature verification failed", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.metadata?.userId;
    const programId = session.metadata?.programId;

    if (userId && programId) {
      await prisma.entitlement.upsert({
        where: { userId_programId: { userId, programId } },
        create: {
          userId,
          programId,
          stripeSessionId: session.id,
          stripePaymentIntent: session.payment_intent as string,
          status: "ACTIVE",
        },
        update: {
          stripeSessionId: session.id,
          stripePaymentIntent: session.payment_intent as string,
          status: "ACTIVE",
        },
      });
    }
  }

  return NextResponse.json({ received: true });
}
