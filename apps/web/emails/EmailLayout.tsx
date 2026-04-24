import {
  Body,
  Container,
  Head,
  Html,
  Preview,
  Section,
  Text,
  Link,
  Hr,
} from "@react-email/components";
import * as React from "react";

export interface EmailBrand {
  /** Hex color for primary CTA button background. */
  accent: string;
  /** Hex color for accent text on light surface. */
  accentText?: string;
  /** Page background color. Default white. */
  background?: string;
  /** Body text color. Default near-black. */
  text?: string;
}

interface EmailLayoutProps {
  preview: string;
  brand?: EmailBrand;
  appUrl?: string;
  children: React.ReactNode;
}

const DEFAULT_BRAND: Required<Omit<EmailBrand, "accentText">> & { accentText: string } = {
  accent: "#2563eb",
  accentText: "#ffffff",
  background: "#f6f7f9",
  text: "#0f172a",
};

export function EmailLayout({ preview, brand, appUrl, children }: EmailLayoutProps) {
  const b = { ...DEFAULT_BRAND, ...brand };
  const home = appUrl || "https://app.journeyline.ai";

  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body
        style={{
          margin: 0,
          padding: 0,
          backgroundColor: b.background,
          color: b.text,
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
          lineHeight: 1.5,
        }}
      >
        <Container
          style={{
            margin: "0 auto",
            padding: "32px 16px",
            maxWidth: 560,
          }}
        >
          <Section
            style={{
              backgroundColor: "#ffffff",
              borderRadius: 12,
              padding: "32px 28px",
              border: "1px solid #e6e8ec",
            }}
          >
            {children}
          </Section>

          <Hr style={{ borderColor: "transparent", margin: "24px 0 12px" }} />

          <Section style={{ textAlign: "center" }}>
            <Text style={{ fontSize: 12, color: "#94a3b8", margin: 0 }}>
              Powered by{" "}
              <Link href={home} style={{ color: "#94a3b8", textDecoration: "underline" }}>
                JourneyLine
              </Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

export function PrimaryButton({
  href,
  brand,
  children,
}: {
  href: string;
  brand?: EmailBrand;
  children: React.ReactNode;
}) {
  const b = { ...DEFAULT_BRAND, ...brand };
  return (
    <a
      href={href}
      style={{
        display: "inline-block",
        backgroundColor: b.accent,
        color: b.accentText,
        textDecoration: "none",
        padding: "14px 28px",
        borderRadius: 10,
        fontWeight: 600,
        fontSize: 16,
        lineHeight: 1,
      }}
    >
      {children}
    </a>
  );
}
