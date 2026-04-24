import { Heading, Img, Section, Text, Link, Hr } from "@react-email/components";
import * as React from "react";
import { EmailLayout, PrimaryButton, type EmailBrand } from "./EmailLayout";

export interface WelcomeLearnerProps {
  creatorName: string;
  creatorAvatarUrl: string | null;
  programTitle: string;
  targetTransformation: string | null;
  lessonCount: number;
  totalMinutes: number | null;
  firstLessonTitles: string[];
  heroImageUrl: string | null;
  magicLinkUrl: string;
  fallbackUrl: string;
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
    firstLessonTitles,
    heroImageUrl,
    magicLinkUrl,
    fallbackUrl,
    brand,
    appUrl,
  } = props;

  const initial = (creatorName || "·").trim().charAt(0).toUpperCase();
  const totals = [
    `${lessonCount} ${lessonCount === 1 ? "lesson" : "lessons"}`,
    totalMinutes ? `${totalMinutes} min total` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <EmailLayout
      preview={`${creatorName} just sent you ${programTitle}`}
      brand={brand}
      appUrl={appUrl}
    >
      <Section style={{ display: "table", width: "100%", marginBottom: 16 }}>
        <div style={{ display: "table-cell", verticalAlign: "middle", width: 56 }}>
          {creatorAvatarUrl ? (
            <Img
              src={creatorAvatarUrl}
              width="48"
              height="48"
              alt={creatorName}
              style={{ borderRadius: 24, display: "block" }}
            />
          ) : (
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor: brand.accent,
                color: brand.accentText || "#ffffff",
                fontSize: 20,
                fontWeight: 700,
                lineHeight: "48px",
                textAlign: "center",
              }}
            >
              {initial}
            </div>
          )}
        </div>
        <div style={{ display: "table-cell", verticalAlign: "middle", paddingLeft: 12 }}>
          <Text style={{ margin: 0, fontSize: 14, color: "#64748b" }}>
            <strong style={{ color: "#0f172a" }}>{creatorName}</strong> sent you something
          </Text>
        </div>
      </Section>

      <Heading
        as="h1"
        style={{
          fontSize: 26,
          lineHeight: 1.2,
          margin: "8px 0 8px",
          color: "#0f172a",
        }}
      >
        {programTitle}
      </Heading>

      {targetTransformation ? (
        <Text style={{ fontSize: 16, color: "#475569", margin: "0 0 20px" }}>
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
            borderRadius: 10,
            display: "block",
            margin: "0 0 20px",
          }}
        />
      ) : null}

      {totals ? (
        <Text
          style={{
            fontSize: 13,
            color: "#64748b",
            textTransform: "uppercase",
            letterSpacing: 0.6,
            margin: "0 0 8px",
          }}
        >
          {totals}
        </Text>
      ) : null}

      {firstLessonTitles.length > 0 ? (
        <ul style={{ margin: "0 0 24px", padding: "0 0 0 18px", color: "#0f172a" }}>
          {firstLessonTitles.map((t, i) => (
            <li key={i} style={{ fontSize: 15, lineHeight: 1.6 }}>
              {t}
            </li>
          ))}
        </ul>
      ) : null}

      <Section style={{ textAlign: "center", margin: "8px 0 16px" }}>
        <PrimaryButton href={magicLinkUrl} brand={brand}>
          Start your program
        </PrimaryButton>
      </Section>

      <Text style={{ fontSize: 12, color: "#94a3b8", textAlign: "center", margin: "0 0 16px" }}>
        This link works for 24 hours. Need a new one later? Just visit{" "}
        <Link href={fallbackUrl} style={{ color: "#94a3b8" }}>
          your program page
        </Link>{" "}
        and we'll send a fresh link.
      </Text>

      <Hr style={{ borderColor: "#eef0f4", margin: "20px 0" }} />

      <Text style={{ fontSize: 12, color: "#94a3b8", margin: 0 }}>
        Reply to this email to chat with {creatorName} directly.
      </Text>
    </EmailLayout>
  );
}

export default WelcomeLearner;
