import Stripe from "stripe";

let stripeInstance: Stripe | null = null;

/**
 * Get Stripe instance with lazy initialization.
 * Throws only when called, not at module load time.
 */
export function getStripe(): Stripe {
  if (!stripeInstance) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      throw new Error("STRIPE_SECRET_KEY is not configured");
    }
    stripeInstance = new Stripe(key, {
      apiVersion: "2025-02-24.acacia",
      typescript: true,
    });
  }
  return stripeInstance;
}

/**
 * Check if Stripe is configured (has API key).
 * Use this to conditionally enable/disable Stripe features.
 */
export function isStripeConfigured(): boolean {
  return !!process.env.STRIPE_SECRET_KEY;
}
