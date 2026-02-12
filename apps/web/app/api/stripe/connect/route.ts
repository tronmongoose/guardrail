import { NextRequest, NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getStripe, isStripeConfigured } from "@/lib/stripe";
import { logger } from "@/lib/logger";

/**
 * POST /api/stripe/connect
 * Creates or retrieves a Stripe Connect onboarding link for the creator.
 */
export async function POST(_req: NextRequest) {
  if (!isStripeConfigured()) {
    return NextResponse.json(
      { error: "Stripe not configured" },
      { status: 503 }
    );
  }

  const user = await getOrCreateUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const stripe = getStripe();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  try {
    let accountId = user.stripeAccountId;

    // Create Stripe Connect account if doesn't exist
    if (!accountId) {
      const account = await stripe.accounts.create({
        type: "express",
        email: user.email,
        metadata: {
          userId: user.id,
        },
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
      });

      accountId = account.id;

      // Save to database
      await prisma.user.update({
        where: { id: user.id },
        data: {
          stripeAccountId: accountId,
          stripeAccountStatus: "pending",
        },
      });

      logger.info({
        operation: "stripe.connect.account_created",
        userId: user.id,
        accountId,
      });
    }

    // Create account link for onboarding/dashboard
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${appUrl}/dashboard?stripe=refresh`,
      return_url: `${appUrl}/dashboard?stripe=success`,
      type: "account_onboarding",
    });

    return NextResponse.json({ url: accountLink.url });
  } catch (error) {
    logger.error(
      { operation: "stripe.connect.onboarding_failed", userId: user.id },
      error
    );

    // Extract Stripe error details for debugging
    const stripeError = error as { type?: string; code?: string; message?: string };
    const errorMessage = stripeError.message || "Failed to create onboarding link";
    const errorCode = stripeError.code || stripeError.type || "unknown";

    return NextResponse.json(
      {
        error: errorMessage,
        code: errorCode,
        hint: errorCode === "account_invalid"
          ? "The Stripe account may have been deleted. Try again."
          : errorCode === "api_key_expired"
          ? "Stripe API key has expired. Check your environment variables."
          : undefined
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/stripe/connect
 * Returns the current Stripe Connect account status for the creator.
 */
export async function GET(_req: NextRequest) {
  if (!isStripeConfigured()) {
    return NextResponse.json(
      { error: "Stripe not configured" },
      { status: 503 }
    );
  }

  const user = await getOrCreateUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!user.stripeAccountId) {
    return NextResponse.json({
      connected: false,
      status: null,
      onboardingComplete: false,
    });
  }

  try {
    const stripe = getStripe();
    const account = await stripe.accounts.retrieve(user.stripeAccountId);

    // Update status in database if changed
    const newStatus = account.charges_enabled ? "active" : "pending";
    const isComplete = account.details_submitted ?? false;

    if (
      user.stripeAccountStatus !== newStatus ||
      user.stripeOnboardingComplete !== isComplete
    ) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          stripeAccountStatus: newStatus,
          stripeOnboardingComplete: isComplete,
        },
      });
    }

    return NextResponse.json({
      connected: true,
      status: newStatus,
      onboardingComplete: isComplete,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
    });
  } catch (error) {
    logger.error(
      { operation: "stripe.connect.status_check_failed", userId: user.id },
      error
    );
    return NextResponse.json(
      { error: "Failed to retrieve account status" },
      { status: 500 }
    );
  }
}
