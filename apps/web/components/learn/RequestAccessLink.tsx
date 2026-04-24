"use client";

import { useState } from "react";

interface RequestAccessLinkProps {
  programId: string;
  programTitle: string;
  creatorName: string | null;
}

type Status = "idle" | "sending" | "sent" | "rate_limited" | "error";

export function RequestAccessLink({
  programId,
  programTitle,
  creatorName,
}: RequestAccessLinkProps) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;

    setStatus("sending");
    setErrorMessage("");

    try {
      const res = await fetch("/api/auth/resend-magic-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), programId }),
      });

      if (res.ok) {
        setStatus("sent");
        return;
      }

      if (res.status === 429) {
        setStatus("rate_limited");
        return;
      }

      const body = await res.json().catch(() => ({}));
      setErrorMessage(body?.error || "Something went wrong. Please try again.");
      setStatus("error");
    } catch {
      setErrorMessage("Network error. Please try again.");
      setStatus("error");
    }
  }

  if (status === "sent") {
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 py-12 text-center">
        <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
          <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="mb-2 text-2xl font-semibold text-slate-900">Check your inbox</h1>
        <p className="text-slate-600">
          We just sent a sign-in link to <strong>{email}</strong>. It works for 24 hours.
        </p>
        <p className="mt-4 text-sm text-slate-500">
          Don't see it? Check your spam folder, or try again in a couple minutes.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 py-12">
      <div className="w-full">
        <p className="mb-2 text-sm uppercase tracking-wider text-slate-500">
          {creatorName ? `${creatorName}'s program` : "Your program"}
        </p>
        <h1 className="mb-3 text-3xl font-semibold text-slate-900">{programTitle}</h1>
        <p className="mb-8 text-slate-600">
          Enter the email you signed up with and we'll send you a fresh sign-in link.
        </p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="email"
            inputMode="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            disabled={status === "sending"}
            className="w-full rounded-lg border border-slate-300 px-4 py-3 text-base text-slate-900 placeholder-slate-400 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
          />
          <button
            type="submit"
            disabled={status === "sending" || !email.trim()}
            className="w-full rounded-lg bg-slate-900 px-4 py-3 text-base font-medium text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {status === "sending" ? "Sending…" : "Send sign-in link"}
          </button>

          {status === "rate_limited" ? (
            <p className="text-sm text-amber-600">
              Please wait a couple minutes before requesting another link.
            </p>
          ) : null}

          {status === "error" && errorMessage ? (
            <p className="text-sm text-red-600">{errorMessage}</p>
          ) : null}
        </form>

        <p className="mt-8 text-center text-xs text-slate-400">
          For your security, sign-in links are short-lived and single-use.
        </p>
      </div>
    </div>
  );
}
