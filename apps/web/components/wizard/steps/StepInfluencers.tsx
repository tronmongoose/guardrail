"use client";

import { useState, useEffect } from "react";

interface Influencer {
  id: string;
  name: string;
  platform: string;
  platformHandle: string;
  avatarUrl: string | null;
  niche: string | null;
  styleProfile: {
    tone?: { primary: string; traits: string[] };
    teachingStyle?: { approach: string };
    pacing?: { speed: string };
  } | null;
}

interface StepInfluencersProps {
  selectedIds: string[];
  onChange: (selectedIds: string[]) => void;
}

export function StepInfluencers({ selectedIds, onChange }: StepInfluencersProps) {
  const [search, setSearch] = useState("");
  const [influencers, setInfluencers] = useState<Influencer[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadInfluencers();
  }, []);

  const loadInfluencers = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/influencers${search ? `?q=${encodeURIComponent(search)}` : ""}`);
      if (res.ok) {
        const data = await res.json();
        setInfluencers(data.influencers || []);
      }
    } catch (error) {
      console.error("Failed to load influencers:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      loadInfluencers();
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [search]);

  const toggleInfluencer = (id: string) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((i) => i !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  const selectedInfluencers = influencers.filter((i) => selectedIds.includes(i.id));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-white mb-2">Style Inspiration (Optional)</h2>
        <p className="text-gray-400 text-sm">
          Select influencers whose teaching style you admire. The AI will match their tone and approach when generating your program content.
        </p>
      </div>

      {/* Search */}
      <div>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search influencers by name..."
          className="w-full px-4 py-2.5 bg-surface-dark border border-surface-border rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:border-neon-cyan focus:ring-1 focus:ring-neon-cyan"
        />
      </div>

      {/* Selected influencers */}
      {selectedInfluencers.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Selected ({selectedInfluencers.length})
          </label>
          <div className="flex flex-wrap gap-2">
            {selectedInfluencers.map((influencer) => (
              <button
                key={influencer.id}
                onClick={() => toggleInfluencer(influencer.id)}
                className="flex items-center gap-2 px-3 py-1.5 bg-neon-pink/20 border border-neon-pink rounded-full text-sm text-neon-pink hover:bg-neon-pink/30 transition"
              >
                {influencer.avatarUrl && (
                  <img src={influencer.avatarUrl} alt="" className="w-5 h-5 rounded-full" />
                )}
                <span>{influencer.name}</span>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Influencer grid */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Available Influencers
        </label>

        {isLoading ? (
          <div className="text-center py-8">
            <div className="w-6 h-6 mx-auto border-2 border-neon-cyan border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-gray-400 mt-2">Loading influencers...</p>
          </div>
        ) : influencers.length === 0 ? (
          <div className="text-center py-8 bg-surface-dark rounded-lg border border-surface-border">
            <svg className="w-12 h-12 mx-auto text-gray-600 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <p className="text-gray-400">No influencers found</p>
            <p className="text-xs text-gray-500 mt-1">Influencers will be added soon. Skip this step for now.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {influencers.map((influencer) => {
              const isSelected = selectedIds.includes(influencer.id);
              return (
                <button
                  key={influencer.id}
                  onClick={() => toggleInfluencer(influencer.id)}
                  className={`
                    flex items-start gap-3 p-3 rounded-lg border text-left transition
                    ${isSelected
                      ? "bg-neon-pink/10 border-neon-pink"
                      : "bg-surface-dark border-surface-border hover:border-neon-cyan/50"
                    }
                  `}
                >
                  {/* Avatar */}
                  <div className="w-12 h-12 rounded-full bg-surface-card overflow-hidden flex-shrink-0">
                    {influencer.avatarUrl ? (
                      <img src={influencer.avatarUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-500">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`font-medium ${isSelected ? "text-neon-pink" : "text-white"}`}>
                        {influencer.name}
                      </span>
                      {isSelected && (
                        <svg className="w-4 h-4 text-neon-pink" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">
                      @{influencer.platformHandle} • {influencer.platform}
                    </p>
                    {influencer.niche && (
                      <span className="inline-block mt-1 px-2 py-0.5 bg-surface-card rounded text-xs text-gray-400">
                        {influencer.niche}
                      </span>
                    )}
                    {influencer.styleProfile && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {influencer.styleProfile.tone?.primary && (
                          <span className="px-1.5 py-0.5 bg-neon-cyan/10 text-neon-cyan text-xs rounded">
                            {influencer.styleProfile.tone.primary}
                          </span>
                        )}
                        {influencer.styleProfile.teachingStyle?.approach && (
                          <span className="px-1.5 py-0.5 bg-neon-yellow/10 text-neon-yellow text-xs rounded">
                            {influencer.styleProfile.teachingStyle.approach}
                          </span>
                        )}
                        {influencer.styleProfile.pacing?.speed && (
                          <span className="px-1.5 py-0.5 bg-neon-pink/10 text-neon-pink text-xs rounded">
                            {influencer.styleProfile.pacing.speed} paced
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Skip notice */}
      <div className="text-center">
        <p className="text-sm text-gray-500">
          This step is optional. Skip if you want the AI to use its default style.
        </p>
      </div>
    </div>
  );
}
