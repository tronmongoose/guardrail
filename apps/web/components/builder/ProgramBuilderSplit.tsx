"use client";

import { useState, useMemo } from "react";
import { TreeNavigation } from "./TreeNavigation";
import { SessionDetailPanel } from "./SessionDetailPanel";
import type { WeekData, YouTubeVideoData, SessionData } from "./StructureBuilder";

interface ProgramBuilderSplitProps {
  programId: string;
  weeks: WeekData[];
  videos: YouTubeVideoData[];
  onUpdate: () => void;
}

export function ProgramBuilderSplit({
  programId,
  weeks,
  videos,
  onUpdate,
}: ProgramBuilderSplitProps) {
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(() => {
    // Auto-select first session if available
    if (weeks.length > 0 && weeks[0].sessions.length > 0) {
      return weeks[0].sessions[0].id;
    }
    return null;
  });

  // Find the selected session and its parent week
  const { selectedSession, selectedWeek } = useMemo(() => {
    for (const week of weeks) {
      const session = week.sessions.find((s) => s.id === selectedSessionId);
      if (session) {
        return { selectedSession: session as SessionData & { keyTakeaways?: string[] }, selectedWeek: week };
      }
    }
    return { selectedSession: null, selectedWeek: null };
  }, [weeks, selectedSessionId]);

  // If selected session was deleted, select next available
  const handleUpdate = () => {
    onUpdate();

    // Check if selected session still exists after update
    if (selectedSessionId) {
      const stillExists = weeks.some((w) =>
        w.sessions.some((s) => s.id === selectedSessionId)
      );
      if (!stillExists) {
        // Find next available session
        for (const week of weeks) {
          if (week.sessions.length > 0) {
            setSelectedSessionId(week.sessions[0].id);
            return;
          }
        }
        setSelectedSessionId(null);
      }
    }
  };

  return (
    <div className="h-[calc(100vh-120px)] flex rounded-xl overflow-hidden border border-surface-border">
      {/* Left panel - Tree Navigation */}
      <div className="w-80 flex-shrink-0">
        <TreeNavigation
          programId={programId}
          weeks={weeks}
          videos={videos}
          selectedSessionId={selectedSessionId}
          onSelectSession={setSelectedSessionId}
          onUpdate={handleUpdate}
        />
      </div>

      {/* Right panel - Session Detail */}
      <div className="flex-1 min-w-0">
        {selectedSession && selectedWeek ? (
          <SessionDetailPanel
            key={selectedSession.id}
            session={selectedSession}
            week={selectedWeek}
            programId={programId}
            videos={videos}
            onUpdate={handleUpdate}
          />
        ) : (
          <div className="h-full flex items-center justify-center bg-surface-dark">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-surface-card border border-surface-border flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                </svg>
              </div>
              <p className="text-gray-400 text-sm mb-1">No session selected</p>
              <p className="text-gray-600 text-xs">
                {weeks.length === 0
                  ? "Add a week to get started"
                  : "Click on a session in the tree to edit it"}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
