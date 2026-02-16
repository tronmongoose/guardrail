"use client";

import { useState } from "react";

interface EnrollButtonProps {
  programId: string;
  isFree: boolean;
  priceDisplay: string;
}

export function EnrollButton({ programId, isFree, priceDisplay }: EnrollButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [success, setSuccess] = useState<string | null>(null);

  const handleEnroll = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(`/api/checkout/${programId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email || undefined, name: name || undefined }),
      });
      const data = await res.json();

      if (!res.ok) {
        if (data.requiresEmail) {
          setShowEmailForm(true);
          setLoading(false);
          return;
        }
        throw new Error(data.error || "Failed to enroll");
      }

      if (data.enrolled && data.message) {
        setSuccess(data.message);
        setShowEmailForm(false);
      } else if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        throw new Error("Unexpected response from server");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  // Success state
  if (success) {
    return (
      <div
        className="rounded-xl p-4 text-center"
        style={{
          backgroundColor: "color-mix(in srgb, var(--skin-accent) 10%, transparent)",
          border: "1px solid color-mix(in srgb, var(--skin-accent) 30%, transparent)",
        }}
      >
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-3"
          style={{ backgroundColor: "color-mix(in srgb, var(--skin-accent) 20%, transparent)" }}
        >
          <svg className="w-5 h-5" style={{ color: "var(--skin-accent)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p className="text-sm font-medium">{success}</p>
        <p className="text-xs mt-1" style={{ color: "var(--skin-text-muted)" }}>Check your inbox for the access link</p>
      </div>
    );
  }

  // Email form
  if (showEmailForm) {
    return (
      <div className="space-y-3">
        <div>
          <label htmlFor="email" className="block text-sm font-medium mb-1">
            Email address
          </label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full px-4 py-2 rounded-lg focus:outline-none"
            style={{
              backgroundColor: "var(--skin-bg-secondary)",
              border: "1px solid var(--skin-border)",
              color: "var(--skin-text)",
            }}
            required
          />
        </div>
        <div>
          <label htmlFor="name" className="block text-sm font-medium mb-1">
            Name <span style={{ color: "var(--skin-text-muted)" }}>(optional)</span>
          </label>
          <input
            type="text"
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            className="w-full px-4 py-2 rounded-lg focus:outline-none"
            style={{
              backgroundColor: "var(--skin-bg-secondary)",
              border: "1px solid var(--skin-border)",
              color: "var(--skin-text)",
            }}
          />
        </div>
        <button
          onClick={handleEnroll}
          disabled={loading || !email}
          className="w-full py-3 rounded-xl font-medium transition disabled:opacity-50"
          style={{ backgroundColor: "var(--skin-accent)", color: "var(--skin-bg)" }}
        >
          {loading ? "Processing..." : isFree ? "Get free access" : "Continue to payment"}
        </button>
        <button
          onClick={() => setShowEmailForm(false)}
          className="w-full py-2 text-sm transition"
          style={{ color: "var(--skin-text-muted)" }}
        >
          Cancel
        </button>
        {error && <p className="text-sm text-red-400">{error}</p>}
      </div>
    );
  }

  // Initial button state
  return (
    <div className="space-y-2">
      <button
        onClick={handleEnroll}
        disabled={loading}
        className="w-full py-3 rounded-xl font-medium transition disabled:opacity-50"
        style={{ backgroundColor: "var(--skin-accent)", color: "var(--skin-bg)" }}
      >
        {loading ? "Processing..." : isFree ? "Enroll free" : `Buy for ${priceDisplay}`}
      </button>
      {error && <p className="text-sm text-red-400">{error}</p>}
    </div>
  );
}
