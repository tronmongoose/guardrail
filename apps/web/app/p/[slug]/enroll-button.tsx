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
        // Check if email is required
        if (data.requiresEmail) {
          setShowEmailForm(true);
          setLoading(false);
          return;
        }
        throw new Error(data.error || "Failed to enroll");
      }

      if (data.enrolled && data.message) {
        // Show success message - user needs to check email
        setSuccess(data.message);
        setShowEmailForm(false);
      } else if (data.checkoutUrl) {
        // Paid program - redirect to Stripe checkout
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
      <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
        <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
          <svg
            className="w-5 h-5 text-green-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <p className="text-sm text-green-800 font-medium">{success}</p>
        <p className="text-xs text-green-600 mt-1">Check your inbox for the access link</p>
      </div>
    );
  }

  // Email form
  if (showEmailForm) {
    return (
      <div className="space-y-3">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            Email address
          </label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
            required
          />
        </div>
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
            Name <span className="text-gray-400">(optional)</span>
          </label>
          <input
            type="text"
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
          />
        </div>
        <button
          onClick={handleEnroll}
          disabled={loading || !email}
          className="w-full py-3 bg-brand-600 text-white rounded-xl font-medium hover:bg-brand-700 transition disabled:opacity-50"
        >
          {loading ? "Processing..." : isFree ? "Get free access" : `Continue to payment`}
        </button>
        <button
          onClick={() => setShowEmailForm(false)}
          className="w-full py-2 text-sm text-gray-500 hover:text-gray-700"
        >
          Cancel
        </button>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    );
  }

  // Initial button state
  return (
    <div className="space-y-2">
      <button
        onClick={handleEnroll}
        disabled={loading}
        className="w-full py-3 bg-brand-600 text-white rounded-xl font-medium hover:bg-brand-700 transition disabled:opacity-50"
      >
        {loading ? "Processing..." : isFree ? "Enroll free" : `Buy for ${priceDisplay}`}
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
