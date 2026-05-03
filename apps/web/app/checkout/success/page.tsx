import Link from "next/link";
import { cookies } from "next/headers";
import { claimAccessFromStripeSession } from "@/lib/claim-access";
import { logger } from "@/lib/logger";
import { ResendMagicLink } from "./ResendMagicLink";

const LEARNER_SESSION_COOKIE = "guiderail_learner_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 90; // 90 days — match /auth/magic

export const dynamic = "force-dynamic";

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ programId?: string; session_id?: string }>;
}) {
  const params = await searchParams;
  const programId = params.programId;
  const sessionId = params.session_id;

  // Try to auto-grant access. Falls back gracefully — the worst case is the
  // user has to click the magic link in their email, which is the prior
  // behavior anyway.
  let granted = false;
  if (programId && sessionId) {
    const result = await claimAccessFromStripeSession(sessionId, programId);
    if (result.ok) {
      const cookieStore = await cookies();
      cookieStore.set(LEARNER_SESSION_COOKIE, result.userId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: SESSION_MAX_AGE,
        path: "/",
      });
      granted = true;
      logger.info({
        operation: "checkout.success.access_granted",
        programId,
        sessionId,
        entitlementCreated: result.entitlementCreated,
      });
    } else {
      logger.warn({
        operation: "checkout.success.claim_failed",
        programId,
        sessionId,
        reason: result.reason,
      });
    }
  }

  return (
    <div className="min-h-screen gradient-bg-radial grid-bg flex items-center justify-center px-6">
      <div className="max-w-md w-full mx-auto">
        <div className="bg-surface-card border border-surface-border rounded-2xl p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-neon-cyan/10 border border-neon-cyan/30 flex items-center justify-center">
            <svg className="w-8 h-8 text-neon-cyan" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>

          <h1 className="text-2xl font-bold text-white mb-2">
            {granted ? "You're in" : "Payment successful"}
          </h1>

          <p className="text-gray-400 mb-6">
            {granted
              ? "Your access is ready. Continue to your program below."
              : "Thank you for your purchase. We've sent an access link to your email — check your inbox to start."}
          </p>

          {!granted && (
            <div className="bg-neon-cyan/5 border border-neon-cyan/20 rounded-lg p-4 mb-6">
              <p className="text-sm text-gray-300">
                <strong className="text-neon-cyan">Next step:</strong> Check your email for an
                access link. The link is valid for 24 hours.
              </p>
            </div>
          )}

          {!granted && programId && <ResendMagicLink programId={programId} />}

          <div className="flex gap-3 justify-center">
            {programId && granted && (
              <Link
                href={`/learn/${programId}`}
                className="px-6 py-3 bg-gradient-to-r from-neon-cyan to-neon-pink text-surface-dark rounded-lg font-medium hover:opacity-90 transition"
              >
                Continue to your program →
              </Link>
            )}
            <Link
              href="/"
              className="px-6 py-3 bg-surface-dark border border-surface-border text-gray-300 rounded-lg font-medium hover:border-neon-cyan hover:text-neon-cyan transition"
            >
              Return home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
