"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { getSkin, getSkinCSSVars, type Skin } from "@/lib/skins";
import { ProgramOverviewPreview } from "./ProgramOverviewPreview";
import { SessionPreview } from "./SessionPreview";
import type { WeekData, SessionData } from "@/components/builder";

interface PreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  program: {
    title: string;
    description: string | null;
    targetAudience: string | null;
    targetTransformation: string | null;
    skinId: string;
    weeks: WeekData[];
  };
}

type PreviewView = "overview" | "session";
type DeviceMode = "desktop" | "mobile";

export function PreviewModal({ isOpen, onClose, program }: PreviewModalProps) {
  const [view, setView] = useState<PreviewView>("overview");
  const [deviceMode, setDeviceMode] = useState<DeviceMode>("desktop");
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  const skin = getSkin(program.skinId);
  const cssVars = getSkinCSSVars(skin);

  // Find selected session data
  const selectedSession = selectedSessionId
    ? program.weeks.flatMap((w) => w.sessions).find((s) => s.id === selectedSessionId)
    : null;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Reset view when opening
  useEffect(() => {
    if (isOpen) {
      setView("overview");
      setSelectedSessionId(null);
    }
  }, [isOpen]);

  function handleSelectSession(sessionId: string) {
    setSelectedSessionId(sessionId);
    setView("session");
  }

  function handleBackToOverview() {
    setView("overview");
    setSelectedSessionId(null);
  }

  if (!mounted || !isOpen) return null;

  const modalContent = (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/90">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 bg-surface-dark border-b border-surface-border">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <span className="text-sm text-gray-400">Preview Mode</span>
          <span className="text-xs px-2 py-0.5 bg-surface-card rounded text-gray-500">
            {skin.name}
          </span>
        </div>

        <div className="flex items-center gap-4">
          {/* View toggle */}
          <div className="flex items-center gap-1 bg-surface-card rounded-lg p-0.5">
            <button
              onClick={() => setView("overview")}
              className={`px-3 py-1 text-xs rounded transition ${
                view === "overview"
                  ? "bg-white text-surface-dark"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setView("session")}
              disabled={!selectedSessionId}
              className={`px-3 py-1 text-xs rounded transition ${
                view === "session"
                  ? "bg-white text-surface-dark"
                  : "text-gray-400 hover:text-white disabled:opacity-50"
              }`}
            >
              Session
            </button>
          </div>

          {/* Device toggle */}
          <div className="flex items-center gap-1 bg-surface-card rounded-lg p-0.5">
            <button
              onClick={() => setDeviceMode("desktop")}
              className={`p-1.5 rounded transition ${
                deviceMode === "desktop"
                  ? "bg-white text-surface-dark"
                  : "text-gray-400 hover:text-white"
              }`}
              title="Desktop view"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </button>
            <button
              onClick={() => setDeviceMode("mobile")}
              className={`p-1.5 rounded transition ${
                deviceMode === "mobile"
                  ? "bg-white text-surface-dark"
                  : "text-gray-400 hover:text-white"
              }`}
              title="Mobile view"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Preview frame */}
      <div className="flex-1 flex items-center justify-center p-4 overflow-auto">
        <div
          className={`
            h-full overflow-auto transition-all
            ${deviceMode === "desktop" ? "w-full max-w-5xl" : "w-[375px]"}
          `}
          style={{
            ...cssVars,
            backgroundColor: skin.colors.bg,
            borderRadius: deviceMode === "mobile" ? "24px" : "8px",
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
          }}
        >
          {view === "overview" ? (
            <ProgramOverviewPreview
              program={program}
              skin={skin}
              onSelectSession={handleSelectSession}
            />
          ) : selectedSession ? (
            <SessionPreview
              session={selectedSession as SessionData & { keyTakeaways?: string[] }}
              skin={skin}
              onBack={handleBackToOverview}
            />
          ) : (
            <div className="flex items-center justify-center h-64">
              <p style={{ color: skin.colors.textMuted }}>
                Select a session from the overview
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
