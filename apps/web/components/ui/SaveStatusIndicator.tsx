import type { SaveStatus } from "@/hooks/useAutosave";
import { Spinner } from "./spinner";

interface SaveStatusIndicatorProps {
  status: SaveStatus;
}

export function SaveStatusIndicator({ status }: SaveStatusIndicatorProps) {
  if (status === "idle") return null;

  return (
    <div className="flex items-center gap-1.5 text-xs transition-opacity">
      {status === "saving" && (
        <>
          <Spinner size="sm" />
          <span className="text-gray-400">Saving...</span>
        </>
      )}
      {status === "saved" && (
        <>
          <svg className="w-3.5 h-3.5 text-neon-cyan" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span className="text-neon-cyan">Saved</span>
        </>
      )}
      {status === "error" && (
        <>
          <svg className="w-3.5 h-3.5 text-neon-pink" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01" />
          </svg>
          <span className="text-neon-pink">Save failed</span>
        </>
      )}
    </div>
  );
}
