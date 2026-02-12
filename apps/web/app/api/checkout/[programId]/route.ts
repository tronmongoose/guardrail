import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getStripe, isStripeConfigured } from "@/lib/stripe";
import { createMagicLink, getMagicLinkUrl } from "@/lib/magic-link";
import { sendMagicLinkEmail } from "@/lib/email";
import { logger } from "@/lib/logger";
import Stripe from "stripe";

// Platform fee percentage (e.g., 10%)
const PLATFORM_FEE_PERCENT = 10;

interface CheckoutRequestBody {
  email?: string;
  name?: string;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ programId: string }> }
) {
  const { programId } = await params;

  // Get current user (from Clerk or magic link session)
  let user = await getCurrentUser();

  // If no session, require email in request body
  let body: CheckoutRequestBody = {};
  try {
    body = await req.json();
  } catch {
    // Empty body is okay for authenticated users
  }

  const program = await prisma.program.findUnique({
    where: { id: programId },
    include: {
      creator: {
        select: {
          id: true,
          stripeAccountId: true,
          stripeOnboardingComplete: true,
        },
      },
    },
  });

  if (!program || !program.published) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // If no authenticated user, create/find user by email
  if (!user) {
    if (!body.email) {
      return NextResponse.json(
        { error: "Email required", requiresEmail: true },
        { status: 400 }
      );
    }

    const normalizedEmail = body.email.toLowerCase().trim();

    // Find or create user
    user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email: normalizedEmail,
          name: body.name || null,
          role: "LEARNER",
        },
      });

      logger.info({
        operation: "checkout.user_created",
        userId: user.id,
        programId,
      });
    }
  }

  // Check if user already has access
  const existing = await prisma.entitlement.findUnique({
    where: { userId_programId: { userId: user.id, programId } },
  });

  if (existing?.status === "ACTIVE") {
    // Already enrolled - send magic link to access
    const { token } = await createMagicLink({
      email: user.email,
      programId,
    });
    const magicLinkUrl = getMagicLinkUrl(token, programId);

    await sendMagicLinkEmail(user.email, magicLinkUrl, program.title);

    return NextResponse.json({
      enrolled: true,
      message: "You already have access. Check your email for the access link.",
    });
  }

  // Free program - grant access and send magic link
  if (program.priceInCents === 0) {
    await prisma.entitlement.upsert({
      where: { userId_programId: { userId: user.id, programId } },
      create: { userId: user.id, programId, status: "ACTIVE" },
      update: { status: "ACTIVE" },
    });

    // Send magic link
    const { token } = await createMagicLink({
      email: user.email,
      programId,
    });
    const magicLinkUrl = getMagicLinkUrl(token, programId);

    await sendMagicLinkEmail(user.email, magicLinkUrl, program.title);

    logger.info({
      operation: "checkout.free_enrollment",
      userId: user.id,
      programId,
    });

    return NextResponse.json({
      enrolled: true,
      message: "You're enrolled! Check your email for the access link.",
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

  // Build checkout session config
  const sessionConfig: Stripe.Checkout.SessionCreateParams = {
    mode: "payment",
    payment_method_types: ["card"],
    line_items: [
      {
        price: program.stripePriceId,
        quantity: 1,
      },
    ],
    success_url: `${appUrl}/checkout/success?programId=${programId}`,
    cancel_url: `${appUrl}/p/${program.slug}?checkout=cancelled`,
    metadata: {
      userId: user.id,
      programId: program.id,
      creatorId: program.creatorId,
    },
    customer_email: user.email,
  };

  // If creator has Stripe Connect, use destination charges for split payments
  if (program.creator.stripeAccountId && program.creator.stripeOnboardingComplete) {
    const applicationFee = Math.round(program.priceInCents * (PLATFORM_FEE_PERCENT / 100));

    sessionConfig.payment_intent_data = {
      application_fee_amount: applicationFee,
      transfer_data: {
        destination: program.creator.stripeAccountId,
      },
    };

    logger.info({
      operation: "checkout.stripe_connect_enabled",
      userId: user.id,
      programId,
      creatorAccountId: program.creator.stripeAccountId,
      applicationFee,
    });
  } else {
    // No Stripe Connect - all funds go to platform
    logger.info({
      operation: "checkout.standard_payment",
      userId: user.id,
      programId,
      note: "Creator has not set up Stripe Connect",
    });
  }

  const session = await stripe.checkout.sessions.create(sessionConfig);

  logger.info({
    operation: "checkout.session_created",
    userId: user.id,
    programId,
    sessionId: session.id,
  });

  return NextResponse.json({ checkoutUrl: session.url });
}
