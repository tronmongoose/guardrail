import { Heading, Img, Section, Text, Hr } from "@react-email/components";
import * as React from "react";
import { EmailLayout, PrimaryButton, type EmailBrand } from "./EmailLayout";

export interface WelcomeLearnerProps {
  creatorName: string;
  creatorAvatarUrl: string | null;
  programTitle: string;
  targetTransformation: string | null;
  lessonCount: number;
  totalMinutes: number | null;
  /** No longer rendered in the redesigned email; kept optional for caller compatibility. */
  firstLessonTitles?: string[];
  heroImageUrl: string | null;
  magicLinkUrl: string;
  /** No longer rendered in the redesigned email; kept optional for caller compatibility. */
  fallbackUrl?: string;
  brand: EmailBrand;
  appUrl?: string;
}

export function WelcomeLearner(props: WelcomeLearnerProps) {
  const {
    creatorName,
    creatorAvatarUrl,
    programTitle,
    targetTransformation,
    lessonCount,
    totalMinutes,
    heroImageUrl,
    magicLinkUrl,
    brand,
    appUrl,
  } = props;

  const initial = (creatorName || "·").trim().charAt(0).toUpperCase();
  const accent = brand.accent;
  const accentText = brand.accentText || "#ffffff";

  const meta = [
    `${lessonCount} ${lessonCount === 1 ? "lesson" : "lessons"}`,
    totalMinutes ? `${totalMinutes} min total` : null,
  ]
    .filter(Boolean)
    .join("  ·  ");

  return (
    <EmailLayout
      preview={`${creatorName} just sent you ${programTitle}`}
      brand={brand}
      appUrl={appUrl}
    >
      {/* Accent band — anchors the design and pulls the brand color forward */}
      <div
        style={{
          height: 4,
          backgroundColor: accent,
          borderRadius: 2,
          margin: "-32px -28px 28px",
        }}
      />

      {/* Hero — centered avatar + "sent you" attribution */}
      <Section style={{ textAlign: "center", margin: "0 0 20px" }}>
        {creatorAvatarUrl ? (
          <Img
            src={creatorAvatarUrl}
            width="64"
            height="64"
            alt={creatorName}
            style={{
              borderRadius: 32,
              display: "inline-block",
              border: `2px solid ${accent}`,
            }}
          />
        ) : (
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 32,
              backgroundColor: accent,
              color: accentText,
              fontSize: 26,
              fontWeight: 700,
              lineHeight: "64px",
              textAlign: "center",
              display: "inline-block",
            }}
          >
            {initial}
          </div>
        )}
        <Text
          style={{
            margin: "12px 0 0",
            fontSize: 13,
            color: "#64748b",
            textTransform: "uppercase",
            letterSpacing: 0.8,
          }}
        >
          {creatorName} sent you
        </Text>
      </Section>

      {/* Program title — large and confident */}
      <Heading
        as="h1"
        style={{
          fontSize: 30,
          lineHeight: 1.15,
          fontWeight: 700,
          margin: "0 0 12px",
          color: "#0f172a",
          textAlign: "center",
        }}
      >
        {programTitle}
      </Heading>

      {targetTransformation ? (
        <Text
          style={{
            fontSize: 16,
            lineHeight: 1.55,
            color: "#475569",
            margin: "0 0 24px",
            textAlign: "center",
          }}
        >
          {targetTransformation}
        </Text>
      ) : null}

      {heroImageUrl ? (
        <Img
          src={heroImageUrl}
          width="504"
          alt={programTitle}
          style={{
            width: "100%",
            maxWidth: 504,
            borderRadius: 12,
            display: "block",
            margin: "8px 0 24px",
          }}
        />
      ) : null}

      {meta ? (
        <Text
          style={{
            fontSize: 13,
            color: "#64748b",
            margin: "0 0 24px",
            textAlign: "center",
          }}
        >
          {meta}
        </Text>
      ) : null}

      {/* Single, confident CTA */}
      <Section style={{ textAlign: "center", margin: "8px 0 12px" }}>
        <PrimaryButton href={magicLinkUrl} brand={brand}>
          Start your program  →
        </PrimaryButton>
      </Section>

      <Text
        style={{
          fontSize: 12,
          color: "#94a3b8",
          textAlign: "center",
          margin: "0 0 8px",
        }}
      >
        Your access link works for 24 hours.
      </Text>

      <Hr style={{ borderColor: "#eef0f4", margin: "24px 0 16px" }} />

      <Text
        style={{
          fontSize: 13,
          color: "#64748b",
          margin: 0,
          textAlign: "center",
          fontStyle: "italic",
        }}
      >
        Questions? Just reply to this email — it goes straight to {creatorName}.
      </Text>
    </EmailLayout>
  );
}

export default WelcomeLearner;
