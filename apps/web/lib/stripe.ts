import Stripe from "stripe";

// #COMPLETION_DRIVE: Lazy init so app boots without STRIPE_SECRET_KEY for local dev
// #SUGGEST_VERIFY: Set real key before testing checkout/publish flows
let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
    _stripe = new Stripe(key, { apiVersion: "2024-12-18.acacia" });
  }
  return _stripe;
}

// Keep backward compat — but will throw at call time, not import time
export const stripe = new Proxy({} as Stripe, {
  get(_, prop) {
    return (getStripe() as Record<string | symbol, unknown>)[prop];
  },
});
