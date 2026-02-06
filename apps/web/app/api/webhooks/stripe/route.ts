import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import Stripe from "stripe";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("STRIPE_WEBHOOK_SECRET not configured");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // Handle the event
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const { userId, programId } = session.metadata || {};

      if (!userId || !programId) {
        console.error("Missing metadata in checkout session:", session.id);
        break;
      }

      // Create entitlement for the user
      await prisma.entitlement.upsert({
        where: { userId_programId: { userId, programId } },
        create: {
          userId,
          programId,
          status: "ACTIVE",
          stripeSessionId: session.id,
          stripePaymentIntent: session.payment_intent as string,
        },
        update: {
          status: "ACTIVE",
          stripeSessionId: session.id,
          stripePaymentIntent: session.payment_intent as string,
        },
      });

      console.log(`Entitlement created for user ${userId} on program ${programId}`);
      break;
    }

    case "checkout.session.expired": {
      const session = event.data.object as Stripe.Checkout.Session;
      console.log("Checkout session expired:", session.id);
      break;
    }

    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  return NextResponse.json({ received: true });
}
