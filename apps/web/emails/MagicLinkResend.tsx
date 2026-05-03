import { Heading, Section, Text, Link } from "@react-email/components";
import * as React from "react";
import { EmailLayout, PrimaryButton, type EmailBrand } from "./EmailLayout";

export interface MagicLinkResendProps {
  programTitle?: string;
  magicLinkUrl: string;
  brand?: EmailBrand;
  appUrl?: string;
}

export function MagicLinkResend({ programTitle, magicLinkUrl, brand, appUrl }: MagicLinkResendProps) {
  const previewText = programTitle
    ? `Your access link for ${programTitle}`
    : "Your JourneyLine access link";

  return (
    <EmailLayout preview={previewText} brand={brand} appUrl={appUrl}>
      <Heading
        as="h1"
        style={{ fontSize: 24, lineHeight: 1.2, margin: "0 0 12px", color: "#0f172a" }}
      >
        {programTitle ? `Open ${programTitle}` : "Your access link"}
      </Heading>

      <Text style={{ fontSize: 15, color: "#475569", margin: "0 0 24px" }}>
        Tap the button below to open your program. The link works for 24 hours and can only
        be used once.
      </Text>

      <Section style={{ textAlign: "center", margin: "8px 0 16px" }}>
        <PrimaryButton href={magicLinkUrl} brand={brand}>
          {programTitle ? "Open program" : "Sign in"}
        </PrimaryButton>
      </Section>

      <Text style={{ fontSize: 12, color: "#94a3b8", margin: "16px 0 0", wordBreak: "break-all" }}>
        Or paste this link into your browser:{" "}
        <Link href={magicLinkUrl} style={{ color: "#94a3b8" }}>
          {magicLinkUrl}
        </Link>
      </Text>
    </EmailLayout>
  );
}

export default MagicLinkResend;
