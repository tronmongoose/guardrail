import { Heading, Section, Text, Hr } from "@react-email/components";
import * as React from "react";
import { EmailLayout, PrimaryButton } from "./EmailLayout";

export interface CreatorEnrollmentProps {
  variant: "paid" | "free";
  creatorName: string;
  programTitle: string;
  learnerEmail: string;
  /** Required when variant === "paid" */
  amountFormatted?: string;
  /** Human-friendly date string like "Mar 12" — only when variant === "paid" and Stripe returned `available_on` */
  payoutAvailableOn?: string | null;
  lifetimeEnrollmentCount: number;
  lifetimeGrossFormatted: string;
  dashboardUrl: string;
  appUrl?: string;
}

export function CreatorEnrollment(props: CreatorEnrollmentProps) {
  const {
    variant,
    creatorName,
    programTitle,
    learnerEmail,
    amountFormatted,
    payoutAvailableOn,
    lifetimeEnrollmentCount,
    lifetimeGrossFormatted,
    dashboardUrl,
    appUrl,
  } = props;

  const isPaid = variant === "paid";
  const headline = isPaid ? "You just got paid" : "You got a new student";
  const previewText = isPaid
    ? `${learnerEmail} just paid you${amountFormatted ? ` ${amountFormatted}` : ""}`
    : `${learnerEmail} just enrolled in ${programTitle}`;

  return (
    <EmailLayout preview={previewText} appUrl={appUrl}>
      <Text style={{ fontSize: 13, color: "#64748b", margin: "0 0 4px", letterSpacing: 0.6, textTransform: "uppercase" }}>
        {isPaid ? "New payment" : "New enrollment"}
      </Text>

      <Heading
        as="h1"
        style={{
          fontSize: 32,
          lineHeight: 1.15,
          margin: "0 0 12px",
          color: "#0f172a",
        }}
      >
        {headline}
        {creatorName ? `, ${creatorName.split(" ")[0]}` : ""}.
      </Heading>

      {isPaid && amountFormatted ? (
        <Text
          style={{
            fontSize: 44,
            lineHeight: 1,
            margin: "16px 0 4px",
            color: "#16a34a",
            fontWeight: 700,
          }}
        >
          {amountFormatted}
        </Text>
      ) : null}

      <Text style={{ fontSize: 16, color: "#0f172a", margin: "12px 0 8px" }}>
        <strong>{learnerEmail}</strong> {isPaid ? "signed up for" : "just enrolled in"}{" "}
        <strong>{programTitle}</strong>.
      </Text>

      {isPaid ? (
        <Section
          style={{
            backgroundColor: "#f8fafc",
            border: "1px solid #e2e8f0",
            borderRadius: 10,
            padding: "16px 18px",
            margin: "20px 0",
          }}
        >
          <Text style={{ margin: 0, fontSize: 13, color: "#64748b", letterSpacing: 0.4, textTransform: "uppercase" }}>
            Payout
          </Text>
          <Text style={{ margin: "4px 0 0", fontSize: 15, color: "#0f172a", lineHeight: 1.5 }}>
            {payoutAvailableOn
              ? <>Funds are scheduled to arrive in your bank around <strong>{payoutAvailableOn}</strong>, on your normal Stripe payout schedule.</>
              : <>Funds typically arrive in your bank in <strong>2–7 days</strong>, depending on your Stripe payout schedule.</>}
          </Text>
        </Section>
      ) : null}

      <Hr style={{ borderColor: "#eef0f4", margin: "20px 0" }} />

      <Text style={{ fontSize: 14, color: "#64748b", margin: "0 0 20px" }}>
        Lifetime: <strong style={{ color: "#0f172a" }}>{lifetimeEnrollmentCount}</strong>{" "}
        {lifetimeEnrollmentCount === 1 ? "enrollment" : "enrollments"} ·{" "}
        <strong style={{ color: "#0f172a" }}>{lifetimeGrossFormatted}</strong> earned
      </Text>

      <Section style={{ textAlign: "center", margin: "8px 0 4px" }}>
        <PrimaryButton href={dashboardUrl}>View your dashboard</PrimaryButton>
      </Section>
    </EmailLayout>
  );
}

export default CreatorEnrollment;
