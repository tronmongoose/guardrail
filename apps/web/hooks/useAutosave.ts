"use client";

import { useState, useEffect, useRef, useCallback } from "react";

export type SaveStatus = "idle" | "saving" | "saved" | "error";

interface UseAutosaveOptions<T> {
  /** Unique key for localStorage (e.g., "new-program-{programId}") */
  storageKey: string;
  /** Current form data to persist */
  data: T;
  /** Whether autosave is active (false until we have a programId) */
  enabled: boolean;
  /** Debounce interval for DB save in ms (default: 2000) */
  debounceMs?: number;
  /** Async function to persist data to server */
  onSave?: (data: T) => Promise<void>;
}

interface UseAutosaveReturn<T> {
  saveStatus: SaveStatus;
  /** Restore data from localStorage. Returns null if nothing stored. */
  restore: () => T | null;
  /** Immediately save pending changes (e.g., before navigation) */
  flush: () => Promise<void>;
  /** Clear stored data (e.g., after successful generation) */
  clear: () => void;
  /** Whether there are unsaved changes relative to last DB save */
  hasUnsavedChanges: boolean;
}

export function useAutosave<T>({
  storageKey,
  data,
  enabled,
  debounceMs = 2000,
  onSave,
}: UseAutosaveOptions<T>): UseAutosaveReturn<T> {
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedRef = useRef<string>("");
  const pendingDataRef = useRef<T>(data);
  const onSaveRef = useRef(onSave);
  const storageKeyRef = useRef(storageKey);

  // Keep refs current without triggering effects
  onSaveRef.current = onSave;
  storageKeyRef.current = storageKey;
  pendingDataRef.current = data;

  const serialized = JSON.stringify(data);

  const hasUnsavedChanges = enabled && serialized !== lastSavedRef.current;

  // Core autosave effect
  useEffect(() => {
    if (!enabled || !storageKey) return;

    // Always write to localStorage immediately
    try {
      localStorage.setItem(storageKey, serialized);
    } catch {
      // Silently fail on quota errors — DB save is the important layer
    }

    // Skip DB save if nothing changed from last save
    if (serialized === lastSavedRef.current) return;

    // Reset debounce timer
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    if (onSaveRef.current) {
      timeoutRef.current = setTimeout(async () => {
        const currentData = pendingDataRef.current;
        const currentSerialized = JSON.stringify(currentData);

        setSaveStatus("saving");
        try {
          await onSaveRef.current!(currentData);
          lastSavedRef.current = currentSerialized;
          setSaveStatus("saved");
          setTimeout(() => setSaveStatus((s) => (s === "saved" ? "idle" : s)), 2000);
        } catch {
          setSaveStatus("error");
          setTimeout(() => setSaveStatus((s) => (s === "error" ? "idle" : s)), 4000);
        }
      }, debounceMs);
    }

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [serialized, enabled, storageKey, debounceMs]);

  const restore = useCallback((): T | null => {
    if (!storageKeyRef.current) return null;
    try {
      const stored = localStorage.getItem(storageKeyRef.current);
      if (stored) {
        const parsed = JSON.parse(stored) as T;
        // Initialize the last-saved ref so we don't immediately re-save restored data
        lastSavedRef.current = stored;
        return parsed;
      }
    } catch {
      // Corrupt data — return null
    }
    return null;
  }, []);

  const flush = useCallback(async () => {
    // Cancel pending debounce
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    const currentData = pendingDataRef.current;
    const currentSerialized = JSON.stringify(currentData);

    if (currentSerialized === lastSavedRef.current) return;
    if (!onSaveRef.current) return;

    setSaveStatus("saving");
    try {
      await onSaveRef.current(currentData);
      lastSavedRef.current = currentSerialized;
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus((s) => (s === "saved" ? "idle" : s)), 2000);
    } catch {
      setSaveStatus("error");
      setTimeout(() => setSaveStatus((s) => (s === "error" ? "idle" : s)), 4000);
    }
  }, []);

  const clear = useCallback(() => {
    if (storageKeyRef.current) {
      localStorage.removeItem(storageKeyRef.current);
    }
    lastSavedRef.current = "";
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  return { saveStatus, restore, flush, clear, hasUnsavedChanges };
}
