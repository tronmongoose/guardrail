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
          from: process.env.EMAIL_FROM || "GuideRail <noreply@guiderail.app>",
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

  // Development mode: log email to console
  console.log("\n========== EMAIL ==========");
  console.log(`To: ${to}`);
  console.log(`Subject: ${subject}`);
  console.log("----------------------------");
  console.log(text);
  console.log("============================\n");

  logger.info({ operation: "email.logged_dev", to, subject });
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
    : "Your GuideRail access link";

  const text = `
Hi there!

${programTitle ? `You've enrolled in "${programTitle}".` : "Welcome to GuideRail!"}

Click the link below to access your learning experience:

${magicLinkUrl}

This link is valid for 24 hours and can only be used once.

Happy learning!
The GuideRail Team
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
    <p>${programTitle ? `You've enrolled in <strong>${programTitle}</strong>.` : "Welcome to GuideRail!"}</p>
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
      The GuideRail Team
    </p>
  </div>
</body>
</html>
`.trim();

  return sendEmail({ to: email, subject, text, html });
}
