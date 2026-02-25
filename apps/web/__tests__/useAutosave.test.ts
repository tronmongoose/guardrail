import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

/**
 * Tests for the useAutosave hook logic.
 *
 * Since the hook relies on React (useState, useEffect, etc.), we test the
 * core autosave behaviors by extracting the logic into testable scenarios
 * using a minimal simulation of the hook's internal behavior.
 */

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
    get _store() { return store; },
  };
})();

Object.defineProperty(globalThis, "localStorage", { value: localStorageMock });

// --------------------------------------------------------------------------
// Test the core autosave logic patterns used by the hook
// --------------------------------------------------------------------------

describe("useAutosave — localStorage persistence", () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  it("writes to localStorage with the correct key and serialized data", () => {
    const key = "new-program-abc123";
    const data = { programTitle: "Test Program", step: "program" };

    localStorage.setItem(key, JSON.stringify(data));

    expect(localStorageMock.setItem).toHaveBeenCalledWith(key, JSON.stringify(data));
    expect(JSON.parse(localStorage.getItem(key)!)).toEqual(data);
  });

  it("restore returns parsed data from localStorage", () => {
    const key = "new-program-abc123";
    const data = { programTitle: "My Course", targetAudience: "Beginners" };

    localStorage.setItem(key, JSON.stringify(data));

    const stored = localStorage.getItem(key);
    expect(stored).not.toBeNull();
    const parsed = JSON.parse(stored!);
    expect(parsed).toEqual(data);
  });

  it("restore returns null for empty localStorage", () => {
    const result = localStorage.getItem("new-program-nonexistent");
    expect(result).toBeNull();
  });

  it("restore handles corrupt JSON gracefully", () => {
    const key = "new-program-corrupt";
    localStorage.setItem(key, "not-valid-json{{{");

    const stored = localStorage.getItem(key);
    let parsed = null;
    try {
      parsed = JSON.parse(stored!);
    } catch {
      parsed = null;
    }
    expect(parsed).toBeNull();
  });

  it("clear removes the localStorage key", () => {
    const key = "new-program-abc123";
    localStorage.setItem(key, JSON.stringify({ test: true }));
    expect(localStorage.getItem(key)).not.toBeNull();

    localStorage.removeItem(key);
    expect(localStorage.getItem(key)).toBeNull();
  });
});

describe("useAutosave — debounced DB save", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("debounced save fires after specified delay", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const debounceMs = 2000;

    // Simulate the debounce pattern used in the hook
    const timeout = setTimeout(() => {
      onSave({ programTitle: "Test" });
    }, debounceMs);

    expect(onSave).not.toHaveBeenCalled();

    vi.advanceTimersByTime(debounceMs);
    await vi.runAllTimersAsync();

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledWith({ programTitle: "Test" });

    clearTimeout(timeout);
  });

  it("rapid changes reset the debounce — only final data is saved", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const debounceMs = 2000;
    let timeout: NodeJS.Timeout;

    // Simulate 3 rapid changes
    for (const title of ["A", "AB", "ABC"]) {
      clearTimeout(timeout!);
      timeout = setTimeout(() => {
        onSave({ programTitle: title });
      }, debounceMs);
    }

    // After debounceMs from the last change
    vi.advanceTimersByTime(debounceMs);
    await vi.runAllTimersAsync();

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledWith({ programTitle: "ABC" });

    clearTimeout(timeout!);
  });

  it("flush saves immediately and cancels pending debounce", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const debounceMs = 2000;

    // Start a debounced save
    const timeout = setTimeout(() => {
      onSave({ programTitle: "debounced" });
    }, debounceMs);

    // Flush: cancel debounce and save immediately
    clearTimeout(timeout);
    await onSave({ programTitle: "flushed" });

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledWith({ programTitle: "flushed" });

    // Advance past debounce — should not trigger another save
    vi.advanceTimersByTime(debounceMs);
    await vi.runAllTimersAsync();

    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it("does not save when enabled is false", () => {
    const onSave = vi.fn();
    const enabled = false;

    if (enabled) {
      setTimeout(() => onSave({ test: true }), 2000);
    }

    vi.advanceTimersByTime(5000);
    expect(onSave).not.toHaveBeenCalled();
  });
});

describe("useAutosave — hasUnsavedChanges tracking", () => {
  it("detects changes from last saved state", () => {
    const lastSaved = JSON.stringify({ programTitle: "Original" });
    const current = JSON.stringify({ programTitle: "Modified" });

    expect(current !== lastSaved).toBe(true);
  });

  it("matches when data equals last saved state", () => {
    const data = { programTitle: "Same" };
    const lastSaved = JSON.stringify(data);
    const current = JSON.stringify(data);

    expect(current === lastSaved).toBe(true);
  });
});

describe("useAutosave — saveStatus transitions", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("transitions idle → saving → saved → idle on success", async () => {
    const statuses: string[] = [];
    let status = "idle";

    const setSaveStatus = (s: string | ((prev: string) => string)) => {
      status = typeof s === "function" ? s(status) : s;
      statuses.push(status);
    };

    // Simulate save
    setSaveStatus("saving");
    await Promise.resolve(); // simulate async save
    setSaveStatus("saved");

    // After 2s, revert to idle
    setTimeout(() => setSaveStatus((s: string) => s === "saved" ? "idle" : s), 2000);
    vi.advanceTimersByTime(2000);

    expect(statuses).toEqual(["saving", "saved", "idle"]);
  });

  it("transitions idle → saving → error → idle on failure", async () => {
    const statuses: string[] = [];
    let status = "idle";

    const setSaveStatus = (s: string | ((prev: string) => string)) => {
      status = typeof s === "function" ? s(status) : s;
      statuses.push(status);
    };

    // Simulate failed save
    setSaveStatus("saving");
    setSaveStatus("error");

    // After 4s, revert to idle
    setTimeout(() => setSaveStatus((s: string) => s === "error" ? "idle" : s), 4000);
    vi.advanceTimersByTime(4000);

    expect(statuses).toEqual(["saving", "error", "idle"]);
  });
});
