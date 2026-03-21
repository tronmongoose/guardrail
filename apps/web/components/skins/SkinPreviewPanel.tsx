"use client";

import { useMemo } from "react";
import { getSkinTokens } from "@/lib/skin-bundles/registry";
import { getTokenCSSVars } from "@/lib/skin-bridge";
import { getSkinCatalogEntry } from "@/lib/skin-bundles/catalog";
import type { CSSProperties } from "react";

interface SkinPreviewPanelProps {
  skinId: string;
}

export function SkinPreviewPanel({ skinId }: SkinPreviewPanelProps) {
  const tokens = useMemo(() => getSkinTokens(skinId), [skinId]);
  const cssVars = useMemo(() => getTokenCSSVars(tokens), [tokens]);
  const entry = getSkinCatalogEntry(skinId);

  return (
    <div
      className="flex flex-col h-full overflow-hidden"
      style={{
        ...(cssVars as CSSProperties),
        backgroundColor: "var(--token-color-bg-default)",
        color: "var(--token-color-text-primary)",
        fontFamily: "var(--token-text-body-md-font)",
      }}
    >
      {/* Skin name header */}
      <div
        className="px-4 py-3 flex items-center justify-between flex-shrink-0"
        style={{
          backgroundColor: "var(--token-color-bg-elevated)",
          borderBottom: "1px solid var(--token-color-border-subtle)",
        }}
      >
        <span
          className="text-xs font-bold tracking-widest uppercase"
          style={{ color: "var(--token-color-text-secondary)" }}
        >
          {entry?.category ?? "skin"}
        </span>
        <span
          className="text-sm font-semibold"
          style={{ color: "var(--token-color-text-primary)" }}
        >
          {entry?.name ?? skinId}
        </span>
      </div>

      {/* Mock program page */}
      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">

        {/* Badge + title */}
        <div>
          <span
            className="inline-block px-2.5 py-0.5 text-[10px] font-semibold mb-2"
            style={{
              borderRadius: "var(--token-comp-chip-radius)",
              backgroundColor: "var(--token-comp-chip-bg)",
              color: "var(--token-comp-chip-text)",
            }}
          >
            8-week program
          </span>
          <h2
            className="text-base font-bold leading-snug"
            style={{
              fontSize: "var(--token-text-heading-lg-size)",
              fontWeight: "var(--token-text-heading-lg-weight)",
              color: "var(--token-color-text-primary)",
            }}
          >
            Build strength from the ground up
          </h2>
          <p
            className="mt-1 text-xs leading-relaxed"
            style={{
              fontSize: "var(--token-text-body-sm-size)",
              color: "var(--token-color-text-secondary)",
            }}
          >
            by Alex Rivera
          </p>
        </div>

        {/* Stats row */}
        <div
          className="flex gap-4 text-xs"
          style={{ color: "var(--token-color-text-secondary)" }}
        >
          {["8 weeks", "16 sessions", "48 actions"].map((stat) => (
            <span key={stat} className="flex items-center gap-1">
              <span
                className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: "var(--token-color-accent)" }}
              />
              {stat}
            </span>
          ))}
        </div>

        {/* Curriculum cards */}
        <div className="space-y-2">
          {[
            { week: 1, title: "Foundation & Mobility", sessions: 2 },
            { week: 2, title: "Building Core Strength", sessions: 2 },
            { week: 3, title: "Progressive Overload", sessions: 2 },
          ].map(({ week, title, sessions }) => (
            <div
              key={week}
              className="flex items-center gap-3 px-3 py-2.5"
              style={{
                borderRadius: "var(--token-radius-md)",
                backgroundColor: "var(--token-color-bg-elevated)",
                border: "1px solid var(--token-color-border-subtle)",
                boxShadow: "var(--token-shadow-sm)",
              }}
            >
              <span
                className="w-6 h-6 flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                style={{
                  borderRadius: "var(--token-radius-sm)",
                  backgroundColor: "var(--token-comp-badge-info-bg)",
                  color: "var(--token-comp-badge-info-text)",
                }}
              >
                {week}
              </span>
              <div className="flex-1 min-w-0">
                <p
                  className="text-xs font-medium truncate"
                  style={{ color: "var(--token-color-text-primary)" }}
                >
                  {title}
                </p>
                <p
                  className="text-[10px]"
                  style={{ color: "var(--token-color-text-secondary)" }}
                >
                  {sessions} sessions
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* CTA button */}
        <button
          className="w-full py-2.5 text-sm font-semibold"
          style={{
            borderRadius: "var(--token-comp-btn-primary-radius)",
            backgroundColor: "var(--token-color-accent)",
            color: "var(--token-color-bg-default)",
          }}
        >
          Enroll free
        </button>
      </div>
    </div>
  );
}
