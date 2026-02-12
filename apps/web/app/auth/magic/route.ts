import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { validateMagicLink } from "@/lib/magic-link";
import { logger } from "@/lib/logger";

const LEARNER_SESSION_COOKIE = "guiderail_learner_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

/**
 * GET /auth/magic?token=xxx
 * Validates a magic link token and creates a learner session.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");
  const programId = searchParams.get("programId");

  if (!token) {
    return NextResponse.redirect(new URL("/?error=missing_token", req.url));
  }

  const result = await validateMagicLink(token);

  if (!result.valid) {
    logger.warn({
      operation: "magic_link.validation_failed",
      error: result.error,
    });
    return NextResponse.redirect(
      new URL(`/?error=${encodeURIComponent(result.error || "invalid_link")}`, req.url)
    );
  }

  // Create session cookie
  const cookieStore = await cookies();
  cookieStore.set(LEARNER_SESSION_COOKIE, result.userId!, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE,
    path: "/",
  });

  logger.info({
    operation: "magic_link.session_created",
    userId: result.userId,
    programId: result.programId || programId || undefined,
  });

  // Redirect to the program's learn page or homepage
  const redirectTo = result.programId || programId
    ? `/learn/${result.programId || programId}`
    : "/";

  return NextResponse.redirect(new URL(redirectTo, req.url));
}
