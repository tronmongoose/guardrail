import { getStripe, isStripeConfigured } from "./stripe";
import { logger } from "./logger";

export interface PayoutInfo {
  /** Date when funds become available in the creator's Stripe balance, if known. */
  availableOn: Date | null;
  /** Net amount in cents that the creator will receive (after Stripe fees). */
  netAmountCents: number | null;
  /** Gross amount in cents (the learner's payment). */
  grossAmountCents: number | null;
  /** Currency code (e.g. "usd"). */
  currency: string | null;
}

/**
 * Resolve payout timing and amounts for a completed Stripe Checkout Session.
 *
 * Walks: Session → PaymentIntent → latest_charge → balance_transaction.available_on
 * Works for both standard charges and Connect destination charges.
 *
 * Returns a partial result on any failure (e.g. payment_intent missing) — never throws.
 */
export async function resolvePayoutInfo(sessionId: string): Promise<PayoutInfo> {
  const empty: PayoutInfo = {
    availableOn: null,
    netAmountCents: null,
    grossAmountCents: null,
    currency: null,
  };

  if (!isStripeConfigured()) return empty;

  try {
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["payment_intent.latest_charge.balance_transaction"],
    });

    const paymentIntent = session.payment_intent;
    if (!paymentIntent || typeof paymentIntent === "string") {
      return {
        ...empty,
        grossAmountCents: session.amount_total,
        currency: session.currency,
      };
    }

    const charge = paymentIntent.latest_charge;
    if (!charge || typeof charge === "string") {
      return {
        ...empty,
        grossAmountCents: session.amount_total,
        currency: session.currency,
      };
    }

    const bt = charge.balance_transaction;
    if (!bt || typeof bt === "string") {
      return {
        availableOn: null,
        netAmountCents: null,
        grossAmountCents: charge.amount,
        currency: charge.currency,
      };
    }

    return {
      availableOn: new Date(bt.available_on * 1000),
      netAmountCents: bt.net,
      grossAmountCents: bt.amount,
      currency: bt.currency,
    };
  } catch (err) {
    logger.warn({
      operation: "stripe.payout.resolve_failed",
      sessionId,
      error: err instanceof Error ? err.message : String(err),
    });
    return empty;
  }
}

/**
 * Format an absolute date as "Mar 12" / "Mar 12, 2027" if year differs from current.
 */
export function formatPayoutDate(d: Date): string {
  const now = new Date();
  const sameYear = d.getUTCFullYear() === now.getUTCFullYear();
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    ...(sameYear ? {} : { year: "numeric" }),
    timeZone: "UTC",
  });
}
