"use client";

import { useState, useMemo, useEffect } from "react";
import { SKIN_CATEGORIES, getSkinCatalogEntry, SKIN_CATALOG } from "@/lib/skin-bundles/catalog";
import { getSkinTokens } from "@/lib/skin-bundles/registry";
import { SkinPreviewPanel } from "./SkinPreviewPanel";

interface SkinPickerProps {
  value: string;
  onChange: (skinId: string) => void;
}

export function SkinPicker({ value, onChange }: SkinPickerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [hoveredSkinId, setHoveredSkinId] = useState<string | null>(null);
  const [openCategories, setOpenCategories] = useState<Set<string>>(() => {
    const entry = getSkinCatalogEntry(value);
    return entry ? new Set([entry.category]) : new Set();
  });

  // When value changes externally, ensure its category is open
  useEffect(() => {
    const entry = getSkinCatalogEntry(value);
    if (entry) {
      setOpenCategories((prev) => {
        if (prev.has(entry.category)) return prev;
        return new Set([...prev, entry.category]);
      });
    }
  }, [value]);

  const query = searchQuery.trim().toLowerCase();

  const filteredCategories = useMemo(() => {
    if (!query) return SKIN_CATEGORIES;
    return SKIN_CATEGORIES.map((cat) => ({
      ...cat,
      skins: cat.skins.filter(
        (s) =>
          s.name.toLowerCase().includes(query) ||
          s.description.toLowerCase().includes(query) ||
          cat.label.toLowerCase().includes(query)
      ),
    })).filter((cat) => cat.skins.length > 0);
  }, [query]);

  const visibleCount = filteredCategories.reduce((n, c) => n + c.skins.length, 0);
  const isSearching = query.length > 0;

  // The skin shown in the preview: hovered > selected
  const previewSkinId = hoveredSkinId ?? value;

  function toggleCategory(catId: string) {
    setOpenCategories((prev) => {
      const next = new Set(prev);
      if (next.has(catId)) next.delete(catId);
      else next.add(catId);
      return next;
    });
  }

  return (
    <div className="flex" style={{ height: 420 }}>
      {/* ── Left panel: picker ── */}
      <div
        className="flex flex-col border border-gray-700 rounded-l-xl overflow-hidden bg-white flex-shrink-0"
        style={{ width: 240 }}
        onMouseLeave={() => setHoveredSkinId(null)}
      >
        {/* Search */}
        <div className="flex items-center gap-2 px-3 py-2.5 border-b border-gray-200 bg-white sticky top-0 z-10 flex-shrink-0">
          <svg className="w-4 h-4 flex-shrink-0" style={{ color: "#9ca3af" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search skins..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 text-sm bg-transparent outline-none placeholder-gray-400 min-w-0"
            style={{ color: "#374151" }}
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} className="text-gray-400 hover:text-gray-600 transition flex-shrink-0">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Category list */}
        <div className="overflow-y-auto flex-1">
          {filteredCategories.map((cat) => {
            const isOpen = isSearching || openCategories.has(cat.id);
            return (
              <div key={cat.id} className="border-b border-gray-100 last:border-b-0">
                <button
                  onClick={() => !isSearching && toggleCategory(cat.id)}
                  className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-gray-50 transition text-left"
                  style={{ cursor: isSearching ? "default" : "pointer" }}
                >
                  <div className="flex items-center gap-2">
                    {!isSearching && (
                      <svg
                        className="w-3 h-3 transition-transform duration-200 flex-shrink-0"
                        style={{ color: "#6b7280", transform: isOpen ? "rotate(90deg)" : "rotate(0deg)" }}
                        fill="none" stroke="currentColor" viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                      </svg>
                    )}
                    <span className="text-xs font-bold tracking-widest" style={{ color: "#374151", letterSpacing: "0.1em" }}>
                      {cat.label}
                    </span>
                  </div>
                  <span className="text-xs" style={{ color: "#9ca3af" }}>{cat.skins.length}</span>
                </button>

                {isOpen && (
                  <div className="pb-1">
                    {cat.skins.map((skin) => {
                      const isSelected = value === skin.id;
                      const tokens = getSkinTokens(skin.id);
                      const isHovered = hoveredSkinId === skin.id;
                      return (
                        <button
                          key={skin.id}
                          onClick={() => onChange(skin.id)}
                          onMouseEnter={() => setHoveredSkinId(skin.id)}
                          className="w-full flex items-center gap-2.5 px-3 py-2 transition text-left"
                          style={{
                            backgroundColor: isHovered
                              ? "#e0f2fe"
                              : isSelected
                              ? "#f0f9ff"
                              : undefined,
                          }}
                        >
                          {/* Swatch */}
                          <div
                            className="flex-shrink-0 w-7 h-7 rounded-md border border-gray-200 overflow-hidden"
                            style={{ backgroundColor: tokens.color.background.default }}
                          >
                            <div className="w-full h-1/2" style={{ backgroundColor: tokens.color.accent.primary }} />
                          </div>

                          {/* Name */}
                          <div className="flex-1 min-w-0">
                            <p
                              className="text-xs font-medium truncate"
                              style={{ color: isSelected ? "#0369a1" : "#374151" }}
                            >
                              {skin.name}
                            </p>
                          </div>

                          {/* Checkmark */}
                          {isSelected && (
                            <svg className="flex-shrink-0 w-3.5 h-3.5" style={{ color: "#0ea5e9" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          {filteredCategories.length === 0 && (
            <div className="px-4 py-8 text-center text-sm" style={{ color: "#9ca3af" }}>
              No skins match &ldquo;{searchQuery}&rdquo;
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-gray-200 text-center text-xs flex-shrink-0 bg-white" style={{ color: "#9ca3af" }}>
          {visibleCount} of {SKIN_CATALOG.length} skins
        </div>
      </div>

      {/* ── Right panel: preview ── */}
      <div
        className="flex-1 border border-l-0 border-gray-700 rounded-r-xl overflow-hidden"
        style={{ minWidth: 0 }}
      >
        <SkinPreviewPanel skinId={previewSkinId} />
      </div>
    </div>
  );
}
