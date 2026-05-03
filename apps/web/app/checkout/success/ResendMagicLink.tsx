"use client";

import { useState } from "react";

export function ResendMagicLink({ programId }: { programId: string }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleResend() {
    if (!email) return;
    setStatus("sending");
    setError(null);
    try {
      const res = await fetch("/api/auth/resend-magic-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, programId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to resend");
      }
      setStatus("sent");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to resend");
      setStatus("error");
    }
  }

  return (
    <div className="bg-surface-dark rounded-lg p-4 mb-6 text-left">
      <p className="text-xs text-gray-400 mb-2">
        Didn&apos;t get the email? Enter your address to resend:
      </p>
      {status === "sent" ? (
        <p className="text-sm text-neon-cyan">Link sent! Check your inbox.</p>
      ) : (
        <div className="flex gap-2">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="flex-1 px-3 py-2 bg-surface-card border border-surface-border rounded-lg text-white text-sm focus:outline-none focus:border-neon-cyan"
          />
          <button
            onClick={handleResend}
            disabled={!email || status === "sending"}
            className="px-4 py-2 bg-neon-cyan/10 border border-neon-cyan/30 text-neon-cyan rounded-lg text-sm font-medium hover:bg-neon-cyan/20 transition disabled:opacity-50"
          >
            {status === "sending" ? "Sending..." : "Resend"}
          </button>
        </div>
      )}
      {error && <p className="text-xs text-neon-pink mt-2">{error}</p>}
    </div>
  );
}
