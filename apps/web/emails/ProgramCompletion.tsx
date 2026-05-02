import { Heading, Img, Section, Text, Hr } from "@react-email/components";
import * as React from "react";
import { EmailLayout, PrimaryButton, type EmailBrand } from "./EmailLayout";

export interface ProgramCompletionProps {
  creatorName: string;
  creatorAvatarUrl: string | null;
  programTitle: string;
  lessonCount: number;
  totalMinutes: number | null;
  daysEnrolled: number | null;
  heroImageUrl: string | null;
  revisitUrl: string;
  brand: EmailBrand;
  appUrl?: string;
}

export function ProgramCompletion(props: ProgramCompletionProps) {
  const {
    creatorName,
    creatorAvatarUrl,
    programTitle,
    lessonCount,
    totalMinutes,
    daysEnrolled,
    heroImageUrl,
    revisitUrl,
    brand,
    appUrl,
  } = props;

  const initial = (creatorName || "·").trim().charAt(0).toUpperCase();
  const stats = [
    `${lessonCount} ${lessonCount === 1 ? "lesson" : "lessons"} done`,
    totalMinutes ? `${totalMinutes} min watched` : null,
    daysEnrolled ? `${daysEnrolled} ${daysEnrolled === 1 ? "day" : "days"}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <EmailLayout
      preview={`You finished ${programTitle}`}
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
            <strong style={{ color: "#0f172a" }}>{creatorName}</strong> · congratulations
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
        You finished {programTitle}.
      </Heading>

      <Text style={{ fontSize: 16, color: "#475569", margin: "0 0 20px" }}>
        That's the whole program — every lesson, every action. Real follow-through. Take a second to feel that before you move on.
      </Text>

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

      {stats ? (
        <Text
          style={{
            fontSize: 13,
            color: "#64748b",
            textTransform: "uppercase",
            letterSpacing: 0.6,
            margin: "0 0 20px",
          }}
        >
          {stats}
        </Text>
      ) : null}

      <Section style={{ textAlign: "center", margin: "8px 0 16px" }}>
        <PrimaryButton href={revisitUrl} brand={brand}>
          Revisit your program
        </PrimaryButton>
      </Section>

      <Text style={{ fontSize: 12, color: "#94a3b8", textAlign: "center", margin: "0 0 16px" }}>
        Your access doesn't expire. Come back anytime to rewatch, re-do, or pick up the parts that matter most.
      </Text>

      <Hr style={{ borderColor: "#eef0f4", margin: "20px 0" }} />

      <Text style={{ fontSize: 12, color: "#94a3b8", margin: 0 }}>
        Reply to this email to tell {creatorName} how it went — they'll see it directly.
      </Text>
    </EmailLayout>
  );
}

export default ProgramCompletion;
