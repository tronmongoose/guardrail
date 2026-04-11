"use client";

import { useState, useMemo, useEffect } from "react";
import { SKIN_CATEGORIES, getSkinCatalogEntry, SKIN_CATALOG } from "@/lib/skin-bundles/catalog";
import { getSkinTokens } from "@/lib/skin-bundles/registry";
import { SkinIcon, CategoryIcon, useCustomSkins } from "./skin-picker-shared";
import type { SkinTokens } from "@guide-rail/shared";

interface SkinSidebarProps {
  value: string;
  onChange: (skinId: string) => void;
  onHover?: (skinId: string | null) => void;
  onGenerateSkin?: () => Promise<string | null>;
  isOpen: boolean;
  onToggle: () => void;
}

export function SkinSidebar({
  value,
  onChange,
  onHover,
  onGenerateSkin,
  isOpen,
  onToggle,
}: SkinSidebarProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const { customSkins, reloadCustomSkins } = useCustomSkins();
  const [generating, setGenerating] = useState(false);

  const [openCategories, setOpenCategories] = useState<Set<string>>(() => {
    if (value === "auto-generate" || value.startsWith("custom:")) return new Set(["my-brand"]);
    const entry = getSkinCatalogEntry(value);
    return entry ? new Set([entry.category]) : new Set(["classic"]);
  });

  // Sync open category when value changes externally
  useEffect(() => {
    if (value === "auto-generate" || value.startsWith("custom:")) {
      setOpenCategories((prev) => {
        if (prev.has("my-brand")) return prev;
        return new Set([...prev, "my-brand"]);
      });
      return;
    }
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

  function toggleCategory(catId: string) {
    setOpenCategories((prev) => {
      const next = new Set(prev);
      if (next.has(catId)) next.delete(catId);
      else next.add(catId);
      return next;
    });
  }

  async function handleGenerateSkin() {
    if (!onGenerateSkin) return;
    setGenerating(true);
    try {
      const newSkinId = await onGenerateSkin();
      await reloadCustomSkins();
      if (newSkinId) onChange(newSkinId);
    } finally {
      setGenerating(false);
    }
  }

  // ── Skin row (dark theme) ──────────────────────────────────────────────────
  function SkinRow({ skinId, name }: { skinId: string; name: string }) {
    const isSelected = value === skinId;
    const isCustom = skinId.startsWith("custom:");
    const customTokens = isCustom
      ? customSkins.find((s) => s.id === skinId.replace("custom:", ""))?.tokens
      : undefined;

    return (
      <button
        onClick={() => onChange(skinId)}
        onMouseEnter={() => onHover?.(skinId)}
        className={`w-full flex items-center gap-2.5 px-3 py-1.5 transition-colors text-left rounded-md ${
          isSelected
            ? "bg-gray-800"
            : "hover:bg-gray-800/60"
        }`}
      >
        {isCustom && customTokens ? (
          <div
            className="flex-shrink-0 w-7 h-7 rounded-md flex items-center justify-center overflow-hidden"
            style={{
              backgroundColor: customTokens.color.background.default,
              border: `1.5px solid ${customTokens.color.accent.primary}55`,
            }}
          >
            <div className="w-3.5 h-3.5 rounded-sm" style={{ backgroundColor: customTokens.color.accent.primary }} />
          </div>
        ) : (
          <SkinIcon skinId={skinId} />
        )}
        <span
          className={`flex-1 text-xs font-medium truncate ${
            isSelected ? "text-white" : "text-gray-300"
          }`}
        >
          {name}
        </span>
        {isSelected && (
          <svg className="flex-shrink-0 w-3.5 h-3.5 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        )}
      </button>
    );
  }

  return (
    <>
      {/* ── Desktop sidebar ─────────────────────────────────────────────────── */}
      <div
        className="hidden md:flex flex-col flex-shrink-0 border-r border-gray-700 bg-gray-900 overflow-hidden transition-all duration-200"
        style={{ width: isOpen ? 280 : 0 }}
        onMouseLeave={() => onHover?.(null)}
      >
        <div className="flex flex-col h-full" style={{ width: 280 }}>
          {/* Search */}
          <div className="flex items-center gap-2 px-3 py-2.5 border-b border-gray-700 flex-shrink-0">
            <svg className="w-4 h-4 flex-shrink-0 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search themes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 text-sm bg-transparent outline-none placeholder-gray-500 min-w-0 text-gray-300"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="text-gray-500 hover:text-gray-300 transition flex-shrink-0">
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
                <div key={cat.id} className="border-b border-gray-800 last:border-b-0">
                  <button
                    onClick={() => !isSearching && toggleCategory(cat.id)}
                    className="w-full flex items-center justify-between px-3 py-2 hover:bg-gray-800/50 transition text-left"
                    style={{ cursor: isSearching ? "default" : "pointer" }}
                  >
                    <div className="flex items-center gap-2">
                      {!isSearching && (
                        <svg
                          className="w-3 h-3 transition-transform duration-200 flex-shrink-0 text-gray-500"
                          style={{ transform: isOpen ? "rotate(90deg)" : "rotate(0deg)" }}
                          fill="none" stroke="currentColor" viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                        </svg>
                      )}
                      <span className="text-gray-500">
                        <CategoryIcon path={cat.icon} size={13} />
                      </span>
                      <span className="text-xs font-bold tracking-widest text-gray-400" style={{ letterSpacing: "0.08em" }}>
                        {cat.label}
                      </span>
                    </div>
                    <span className="text-xs text-gray-600">{cat.skins.length}</span>
                  </button>

                  {isOpen && (
                    <div className="pb-1 px-1">
                      {cat.skins.map((skin) => (
                        <SkinRow key={skin.id} skinId={skin.id} name={skin.name} />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {filteredCategories.length === 0 && (
              <div className="px-4 py-8 text-center text-sm text-gray-500">
                No themes match &ldquo;{searchQuery}&rdquo;
              </div>
            )}

            {/* ── My Brand section ── */}
            {!isSearching && (
              <div className="border-t border-gray-800">
                <button
                  onClick={() => toggleCategory("my-brand")}
                  className="w-full flex items-center justify-between px-3 py-2 hover:bg-gray-800/50 transition text-left"
                >
                  <div className="flex items-center gap-2">
                    <svg className="w-3 h-3 transition-transform duration-200 flex-shrink-0 text-gray-500"
                      style={{ transform: openCategories.has("my-brand") ? "rotate(90deg)" : "rotate(0deg)" }}
                      fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                    </svg>
                    <span className="text-gray-500">
                      <CategoryIcon path="M12 2l1.5 4.5H18l-3.75 2.7 1.5 4.5L12 11.2l-3.75 2.5 1.5-4.5L6 6.5h4.5z M8 14l-1 5 5-3 5 3-1-5" size={13} />
                    </span>
                    <span className="text-xs font-bold tracking-widest text-gray-400" style={{ letterSpacing: "0.08em" }}>
                      MY BRAND
                    </span>
                  </div>
                  <span className="text-xs text-gray-600">{1 + customSkins.length}</span>
                </button>

                {openCategories.has("my-brand") && (
                  <div className="pb-1 px-1">
                    {/* Build My Own */}
                    <button
                      onClick={handleGenerateSkin}
                      disabled={generating}
                      onMouseEnter={() => onHover?.("auto-generate")}
                      className={`w-full flex items-center gap-2.5 px-3 py-1.5 transition-colors text-left rounded-md ${
                        value === "auto-generate" ? "bg-gray-800" : "hover:bg-gray-800/60"
                      }`}
                    >
                      <div
                        className="flex-shrink-0 w-7 h-7 rounded-md flex items-center justify-center"
                        style={{ background: "linear-gradient(135deg, #818cf8, #c084fc)", border: "1.5px solid #a78bfa55" }}
                      >
                        {generating ? (
                          <svg className="animate-spin" width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2}>
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="white" strokeWidth="4" />
                            <path className="opacity-75" fill="white" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                        ) : (
                          <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 2l1.5 4.5H18l-3.75 2.7 1.5 4.5L12 11.2l-3.75 2.5 1.5-4.5L6 6.5h4.5z" />
                          </svg>
                        )}
                      </div>
                      <span className={`flex-1 text-xs font-medium truncate ${generating ? "text-purple-300" : "text-gray-300"}`}>
                        {generating ? "Generating..." : "Build My Own"}
                      </span>
                    </button>

                    {/* Existing custom skins */}
                    {customSkins.map((skin) => (
                      <SkinRow key={`custom:${skin.id}`} skinId={`custom:${skin.id}`} name={skin.name} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2 border-t border-gray-700 text-center text-xs text-gray-500 flex-shrink-0">
            {visibleCount} of {SKIN_CATALOG.length} themes
          </div>
        </div>
      </div>

      {/* ── Mobile bottom sheet ─────────────────────────────────────────────── */}
      {isOpen && (
        <div
          className="md:hidden fixed inset-x-0 bottom-0 z-40 bg-gray-900 border-t border-gray-700 rounded-t-2xl shadow-2xl"
          style={{ maxHeight: "50vh" }}
          onMouseLeave={() => onHover?.(null)}
        >
          {/* Handle + close */}
          <div className="flex items-center justify-between px-4 py-2 border-b border-gray-800">
            <div className="flex items-center gap-2">
              <div className="w-8 h-1 rounded-full bg-gray-600 mx-auto" />
              <span className="text-xs font-semibold text-gray-400 ml-2">Themes</span>
            </div>
            <button onClick={onToggle} className="p-1 text-gray-500 hover:text-gray-300">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Scrollable skin list */}
          <div className="overflow-y-auto px-2 py-2" style={{ maxHeight: "calc(50vh - 44px)" }}>
            {SKIN_CATEGORIES.map((cat) => (
              <div key={cat.id} className="mb-1">
                <div className="flex items-center gap-1.5 px-2 py-1.5">
                  <span className="text-gray-500"><CategoryIcon path={cat.icon} size={11} /></span>
                  <span className="text-[10px] font-bold tracking-widest text-gray-500">{cat.label}</span>
                </div>
                <div className="grid grid-cols-2 gap-1 px-1">
                  {cat.skins.map((skin) => {
                    const isSelected = value === skin.id;
                    return (
                      <button
                        key={skin.id}
                        onClick={() => { onChange(skin.id); onToggle(); }}
                        className={`flex items-center gap-2 px-2 py-1.5 rounded-md text-left transition ${
                          isSelected ? "bg-gray-800" : "hover:bg-gray-800/60"
                        }`}
                      >
                        <SkinIcon skinId={skin.id} />
                        <span className={`text-xs truncate ${isSelected ? "text-white font-medium" : "text-gray-400"}`}>
                          {skin.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* My Brand in mobile */}
            <div className="mb-1 border-t border-gray-800 pt-1 mt-1">
              <div className="flex items-center gap-1.5 px-2 py-1.5">
                <span className="text-gray-500">
                  <CategoryIcon path="M12 2l1.5 4.5H18l-3.75 2.7 1.5 4.5L12 11.2l-3.75 2.5 1.5-4.5L6 6.5h4.5z" size={11} />
                </span>
                <span className="text-[10px] font-bold tracking-widest text-gray-500">MY BRAND</span>
              </div>
              <div className="grid grid-cols-2 gap-1 px-1">
                <button
                  onClick={handleGenerateSkin}
                  disabled={generating}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-md text-left hover:bg-gray-800/60 transition"
                >
                  <div
                    className="flex-shrink-0 w-7 h-7 rounded-md flex items-center justify-center"
                    style={{ background: "linear-gradient(135deg, #818cf8, #c084fc)" }}
                  >
                    {generating ? (
                      <svg className="animate-spin" width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2}>
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="white" strokeWidth="4" />
                        <path className="opacity-75" fill="white" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                    ) : (
                      <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 2l1.5 4.5H18l-3.75 2.7 1.5 4.5L12 11.2l-3.75 2.5 1.5-4.5L6 6.5h4.5z" />
                      </svg>
                    )}
                  </div>
                  <span className="text-xs text-gray-400">{generating ? "Generating..." : "Build My Own"}</span>
                </button>
                {customSkins.map((skin) => {
                  const isSelected = value === `custom:${skin.id}`;
                  return (
                    <button
                      key={skin.id}
                      onClick={() => { onChange(`custom:${skin.id}`); onToggle(); }}
                      className={`flex items-center gap-2 px-2 py-1.5 rounded-md text-left transition ${
                        isSelected ? "bg-gray-800" : "hover:bg-gray-800/60"
                      }`}
                    >
                      <div
                        className="flex-shrink-0 w-7 h-7 rounded-md flex items-center justify-center"
                        style={{
                          backgroundColor: skin.tokens.color.background.default,
                          border: `1.5px solid ${skin.tokens.color.accent.primary}55`,
                        }}
                      >
                        <div className="w-3.5 h-3.5 rounded-sm" style={{ backgroundColor: skin.tokens.color.accent.primary }} />
                      </div>
                      <span className={`text-xs truncate ${isSelected ? "text-white font-medium" : "text-gray-400"}`}>
                        {skin.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
