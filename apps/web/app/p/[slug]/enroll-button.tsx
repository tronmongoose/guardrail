"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface EnrollButtonProps {
  programId: string;
  isFree: boolean;
  priceDisplay: string;
}

export function EnrollButton({ programId, isFree, priceDisplay }: EnrollButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleEnroll = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/checkout/${programId}`, { method: "POST" });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to enroll");
      }

      if (data.enrolled && data.learnUrl) {
        // Free enrollment or already enrolled - navigate to learn page
        router.push(data.learnUrl);
      } else if (data.checkoutUrl) {
        // Paid program - redirect to Stripe checkout
        window.location.href = data.checkoutUrl;
      } else {
        throw new Error("Unexpected response from server");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <button
        onClick={handleEnroll}
        disabled={loading}
        className="w-full py-3 bg-brand-600 text-white rounded-xl font-medium hover:bg-brand-700 transition disabled:opacity-50"
      >
        {loading ? "Processing..." : isFree ? "Enroll free" : `Buy for ${priceDisplay}`}
      </button>
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}
