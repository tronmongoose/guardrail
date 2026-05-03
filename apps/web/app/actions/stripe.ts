"use server";

import { getOrCreateUser } from "@/lib/auth";
import { getStripe, isStripeConfigured } from "@/lib/stripe";
import { logger } from "@/lib/logger";

export type StripeLoginLinkResult =
  | { ok: true; url: string }
  | { ok: false; error: string };

/**
 * Mints a one-time Stripe Express dashboard login link for the current creator.
 * Used by the Payments tab "Manage payout account" link when the creator is
 * already onboarded.
 */
export async function createStripeLoginLink(): Promise<StripeLoginLinkResult> {
  if (!isStripeConfigured()) {
    return { ok: false, error: "Stripe not configured" };
  }

  const user = await getOrCreateUser();
  if (!user) {
    return { ok: false, error: "Unauthorized" };
  }
  if (!user.stripeAccountId) {
    return { ok: false, error: "No payout account on file" };
  }

  try {
    const stripe = getStripe();
    const link = await stripe.accounts.createLoginLink(user.stripeAccountId);
    return { ok: true, url: link.url };
  } catch (error) {
    logger.error(
      { operation: "stripe.connect.login_link_failed", userId: user.id },
      error
    );
    return { ok: false, error: "Couldn't open your payout account. Try again in a moment." };
  }
}
