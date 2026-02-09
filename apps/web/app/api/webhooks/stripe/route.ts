import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStripe, isStripeConfigured } from "@/lib/stripe";
import Stripe from "stripe";

export async function POST(req: NextRequest) {
  if (!isStripeConfigured()) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 501 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("STRIPE_WEBHOOK_SECRET not configured");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 501 });
  }

  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // Handle the event
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;

      const userId = session.metadata?.userId;
      const programId = session.metadata?.programId;

      if (!userId || !programId) {
        console.error("Missing metadata in checkout session:", session.id);
        break;
      }

      // Create or update entitlement
      await prisma.entitlement.upsert({
        where: { userId_programId: { userId, programId } },
        create: {
          userId,
          programId,
          status: "ACTIVE",
          stripeSessionId: session.id,
          stripePaymentIntent: typeof session.payment_intent === "string"
            ? session.payment_intent
            : session.payment_intent?.id,
        },
        update: {
          status: "ACTIVE",
          stripeSessionId: session.id,
          stripePaymentIntent: typeof session.payment_intent === "string"
            ? session.payment_intent
            : session.payment_intent?.id,
        },
      });

      console.log(`Entitlement created for user ${userId} on program ${programId}`);
      break;
    }

    case "checkout.session.expired": {
      // Optional: Log expired sessions for analytics
      const session = event.data.object as Stripe.Checkout.Session;
      console.log(`Checkout session expired: ${session.id}`);
      break;
    }

    default:
      // Unhandled event type - just acknowledge
      console.log(`Unhandled event type: ${event.type}`);
  }

  return NextResponse.json({ received: true });
}
