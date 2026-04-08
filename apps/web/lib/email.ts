import { logger } from "./logger";

interface SendEmailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

/**
 * Send an email. Currently logs to console for development.
 * Replace with actual email service (Resend, SendGrid, etc.) for production.
 */
export async function sendEmail({ to, subject, text, html }: SendEmailOptions): Promise<boolean> {
  // Check if we have an email service configured
  const resendApiKey = process.env.RESEND_API_KEY;

  if (resendApiKey) {
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: process.env.EMAIL_FROM || "Journeyline <noreply@journeyline.ai>",
          to,
          subject,
          text,
          html: html || text,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.warn({ operation: "email.send_failed", to, error: errorText });
        return false;
      }

      logger.info({ operation: "email.sent", to, subject });
      return true;
    } catch (error) {
      logger.error({ operation: "email.send_error", to }, error);
      return false;
    }
  }

  // No RESEND_API_KEY — log email contents instead of sending.
  // In production this means emails are silently dropped; warn loudly.
  if (process.env.NODE_ENV === "production") {
    logger.warn({
      operation: "email.skipped_no_key",
      to,
      subject,
      message: "RESEND_API_KEY is not set — email was NOT sent. Add it to your Vercel environment variables.",
    });
    return false;
  }

  logger.info({
    operation: "email.dev_preview",
    to,
    subject,
    body: text,
  });
  return true;
}

/**
 * Send magic link email to learner.
 */
export async function sendMagicLinkEmail(
  email: string,
  magicLinkUrl: string,
  programTitle?: string
): Promise<boolean> {
  const subject = programTitle
    ? `Access your program: ${programTitle}`
    : "Your Journeyline access link";

  const text = `
Hi there!

${programTitle ? `You've enrolled in "${programTitle}".` : "Welcome to Journeyline!"}

Click the link below to access your learning experience:

${magicLinkUrl}

This link is valid for 24 hours and can only be used once.

Happy learning!
The Journeyline Team
`.trim();

  const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .button { display: inline-block; padding: 12px 24px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 8px; font-weight: 500; }
    .footer { margin-top: 40px; font-size: 14px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <h2>Hi there!</h2>
    <p>${programTitle ? `You've enrolled in <strong>${programTitle}</strong>.` : "Welcome to Journeyline!"}</p>
    <p>Click the button below to access your learning experience:</p>
    <p style="margin: 30px 0;">
      <a href="${magicLinkUrl}" class="button">Access Your Program</a>
    </p>
    <p style="font-size: 14px; color: #666;">
      Or copy this link: <a href="${magicLinkUrl}">${magicLinkUrl}</a>
    </p>
    <p class="footer">
      This link is valid for 24 hours and can only be used once.<br>
      Happy learning!<br>
      The Journeyline Team
    </p>
  </div>
</body>
</html>
`.trim();

  return sendEmail({ to: email, subject, text, html });
}

/**
 * Send "your program is ready" notification to the creator when generation completes.
 */
/**
 * Notify admin when a new creator signs up.
 */
export async function notifyAdminNewCreator(user: {
  email: string;
  name?: string | null;
  id: string;
}): Promise<void> {
  const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL;
  if (!adminEmail) return;

  const label = user.name || user.email;
  await sendEmail({
    to: adminEmail,
    subject: `[Journeyline] New creator signup: ${label}`,
    text: `New creator signed up on Journeyline.\n\nName: ${user.name || "—"}\nEmail: ${user.email}\nUser ID: ${user.id}\nTime: ${new Date().toISOString()}\n\n--\nJourneyline Admin Notifications`,
  });
}

/**
 * Notify admin when a creator publishes a program.
 */
export async function notifyAdminProgramPublished(
  program: { id: string; title: string; slug: string; priceInCents: number; currency: string },
  creator: { email: string; name?: string | null },
  stats: { weekCount: number; sessionCount: number },
): Promise<void> {
  const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL;
  if (!adminEmail) return;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://app.journeyline.ai";
  const price = program.priceInCents === 0
    ? "Free"
    : `${(program.priceInCents / 100).toFixed(2)} ${program.currency.toUpperCase()}`;

  await sendEmail({
    to: adminEmail,
    subject: `[Journeyline] Program published: "${program.title}"`,
    text: `A program was just published on Journeyline.\n\nProgram: ${program.title}\nCreator: ${creator.name || "—"} (${creator.email})\nPrice: ${price}\nStructure: ${stats.weekCount} week(s), ${stats.sessionCount} session(s)\nPublic URL: ${appUrl}/p/${program.slug}\n\n--\nJourneyline Admin Notifications`,
  });
}

/**
 * Notify admin when a learner enrolls in a program.
 */
export async function notifyAdminEnrollment(
  learner: { email: string; name?: string | null },
  program: { title: string; id: string },
  enrollmentType: "paid" | "free" | "promo",
): Promise<void> {
  const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL;
  if (!adminEmail) return;

  await sendEmail({
    to: adminEmail,
    subject: `[Journeyline] New enrollment (${enrollmentType}): "${program.title}"`,
    text: `A learner just enrolled in a program.\n\nLearner: ${learner.name || "Anonymous"} (${learner.email})\nProgram: ${program.title}\nEnrollment type: ${enrollmentType}\nProgram ID: ${program.id}\n\n--\nJourneyline Admin Notifications`,
  });
}

/**
 * Send "your program is ready" notification to the creator when generation completes.
 */
export async function sendProgramReadyEmail(
  to: string,
  firstName: string,
  programTitle: string,
  programId: string,
): Promise<boolean> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://app.journeyline.ai";
  const editUrl = `${appUrl}/programs/${programId}/edit`;

  const text = `
Hi ${firstName}!

Great news — your program "${programTitle}" has been generated and is ready for you to review.

Open it here: ${editUrl}

You can edit the curriculum, set your price, and publish whenever you're ready.

The Journeyline Team
`.trim();

  const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 560px; margin: 0 auto; padding: 32px 20px; }
    .button { display: inline-block; padding: 12px 24px; background-color: #06b6d4; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; }
    .footer { margin-top: 40px; font-size: 12px; color: #9ca3af; }
  </style>
</head>
<body>
  <div class="container">
    <h2 style="color:#0f172a">Your program is ready, ${firstName}!</h2>
    <p style="color:#374151">
      <strong>"${programTitle}"</strong> has been generated. Open it to review your curriculum,
      set your price, and publish to learners.
    </p>
    <p style="margin: 28px 0;">
      <a href="${editUrl}" class="button">View Your Program →</a>
    </p>
    <p class="footer">
      Journeyline &middot; <a href="${editUrl}" style="color:#9ca3af">${editUrl}</a>
    </p>
  </div>
</body>
</html>
`.trim();

  return sendEmail({ to, subject: `Your program "${programTitle}" is ready!`, text, html });
}
