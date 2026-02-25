"use client";

import { useEffect } from "react";

/**
 * Shows the browser's native "unsaved changes" dialog when the user
 * tries to close or reload the tab while `shouldWarn` is true.
 */
export function useBeforeUnload(shouldWarn: boolean) {
  useEffect(() => {
    if (!shouldWarn) return;

    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };

    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [shouldWarn]);
}
