// Stripe integration — disabled for initial deploy
// TODO: Re-enable when Stripe keys are configured
export function getStripe(): never {
  throw new Error("Stripe is not configured yet");
}
