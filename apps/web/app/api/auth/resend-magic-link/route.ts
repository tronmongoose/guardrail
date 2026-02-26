import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createMagicLink, getMagicLinkUrl } from "@/lib/magic-link";
import { sendMagicLinkEmail } from "@/lib/email";
import { logger } from "@/lib/logger";

/**
 * POST /api/auth/resend-magic-link
 * Resends a magic link to a learner by email.
 * Rate-limited: max 1 per email per 2 minutes.
 */
export async function POST(req: NextRequest) {
  const { email, programId } = await req.json();

  if (!email || typeof email !== "string") {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  const normalizedEmail = email.toLowerCase().trim();

  // Check if user exists
  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (!user) {
    // Don't reveal whether the email exists — return success anyway
    return NextResponse.json({ success: true });
  }

  // Rate limit: check if a magic link was created for this user in the last 2 minutes
  const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
  const recentLink = await prisma.magicLink.findFirst({
    where: {
      userId: user.id,
      createdAt: { gt: twoMinutesAgo },
    },
    orderBy: { createdAt: "desc" },
  });

  if (recentLink) {
    return NextResponse.json(
      { error: "Please wait a couple minutes before requesting another link" },
      { status: 429 }
    );
  }

  // Get program title for email
  let programTitle: string | undefined;
  if (programId) {
    const program = await prisma.program.findUnique({
      where: { id: programId },
      select: { title: true },
    });
    programTitle = program?.title;
  }

  // Create new magic link and send email
  const { token } = await createMagicLink({
    email: normalizedEmail,
    programId,
  });

  const magicLinkUrl = getMagicLinkUrl(token, programId, true);
  await sendMagicLinkEmail(normalizedEmail, magicLinkUrl, programTitle);

  logger.info({
    operation: "magic_link.resent",
    userId: user.id,
    programId,
  });

  return NextResponse.json({ success: true });
}
