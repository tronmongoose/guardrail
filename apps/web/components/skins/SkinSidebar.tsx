"use client";

import { useState, useMemo, useEffect } from "react";
import type { SkinTokens } from "@guide-rail/shared";
import { SKIN_CATEGORIES, getSkinCatalogEntry, SKIN_CATALOG } from "@/lib/skin-bundles/catalog";
import { SkinIcon, CategoryIcon, useCustomSkins, deleteCustomSkin } from "./skin-picker-shared";
import { SkinStudioModal } from "./SkinStudioModal";

interface SkinSidebarProps {
  value: string;
  onChange: (skinId: string) => void;
  onHover?: (skinId: string | null) => void;
  /** Program id — required for the Skin Studio modal. */
  programId: string;
  programTitle?: string;
  /** Called after a custom skin is created or refined via the studio. */
  onCustomSkinSaved?: (skinId: string, tokens: SkinTokens) => void | Promise<void>;
  isOpen: boolean;
  onToggle: () => void;
}

export function SkinSidebar({
  value,
  onChange,
  onHover,
  programId,
  programTitle,
  onCustomSkinSaved,
  isOpen,
  onToggle,
}: SkinSidebarProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const { customSkins, reloadCustomSkins } = useCustomSkins();

  const [studioOpen, setStudioOpen] = useState(false);
  const [studioInitialSkinId, setStudioInitialSkinId] = useState<string | null>(null);
  const studioInitialSkin = studioInitialSkinId
    ? customSkins.find((s) => s.id === studioInitialSkinId) ?? null
    : null;

  function openStudio(skinId: string | null) {
    setStudioInitialSkinId(skinId);
    setStudioOpen(true);
  }

  async function handleSkinSaved(newSkinId: string, tokens: SkinTokens) {
    await reloadCustomSkins();
    onChange(newSkinId);
    if (onCustomSkinSaved) await onCustomSkinSaved(newSkinId, tokens);
  }

  async function handleDeleteCustom(customId: string, name: string) {
    if (!confirm(`Delete "${name}"? This can't be undone.`)) return;
    const ok = await deleteCustomSkin(customId);
    if (!ok) return;
    await reloadCustomSkins();
    if (value === `custom:${customId}`) onChange("classic-minimal");
  }

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

  // ── Skin row (dark theme) ──────────────────────────────────────────────────
  function SkinRow({ skinId, name }: { skinId: string; name: string }) {
    const isSelected = value === skinId;
    const isCustom = skinId.startsWith("custom:");
    const customId = isCustom ? skinId.replace("custom:", "") : null;
    const customTokens = customId
      ? customSkins.find((s) => s.id === customId)?.tokens
      : undefined;

    return (
      <div
        onMouseEnter={() => onHover?.(skinId)}
        className={`w-full flex items-center gap-2.5 px-3 py-1.5 transition-colors text-left rounded-md group ${
          isSelected ? "bg-gray-800" : "hover:bg-gray-800/60"
        }`}
      >
        <button
          onClick={() => onChange(skinId)}
          className="flex-1 flex items-center gap-2.5 text-left min-w-0"
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
        </button>
        {customId && (
          <>
            <button
              onClick={(e) => { e.stopPropagation(); openStudio(customId); }}
              className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-gray-500 hover:text-teal-400 p-0.5"
              aria-label="Edit skin"
              title="Edit in Skin Studio"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 112.828 2.828L11.828 15.828 9 16l.172-2.828z" />
              </svg>
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); handleDeleteCustom(customId, name); }}
              className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-gray-500 hover:text-red-400 p-0.5"
              aria-label="Delete skin"
              title="Delete skin"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M8 7V4a1 1 0 011-1h6a1 1 0 011 1v3" />
              </svg>
            </button>
          </>
        )}
        {isSelected && !customId && (
          <svg className="flex-shrink-0 w-3.5 h-3.5 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        )}
      </div>
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
                    {/* Build My Own — opens Skin Studio */}
                    <button
                      onClick={() => openStudio(null)}
                      onMouseEnter={() => onHover?.("auto-generate")}
                      className="w-full flex items-center gap-2.5 px-3 py-1.5 transition-colors text-left rounded-md hover:bg-gray-800/60"
                    >
                      <div
                        className="flex-shrink-0 w-7 h-7 rounded-md flex items-center justify-center"
                        style={{ background: "linear-gradient(135deg, #818cf8, #c084fc)", border: "1.5px solid #a78bfa55" }}
                      >
                        <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 2l1.5 4.5H18l-3.75 2.7 1.5 4.5L12 11.2l-3.75 2.5 1.5-4.5L6 6.5h4.5z" />
                        </svg>
                      </div>
                      <span className="flex-1 text-xs font-medium truncate text-gray-300">Build My Own…</span>
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
                  onClick={() => openStudio(null)}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-md text-left hover:bg-gray-800/60 transition"
                >
                  <div
                    className="flex-shrink-0 w-7 h-7 rounded-md flex items-center justify-center"
                    style={{ background: "linear-gradient(135deg, #818cf8, #c084fc)" }}
                  >
                    <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 2l1.5 4.5H18l-3.75 2.7 1.5 4.5L12 11.2l-3.75 2.5 1.5-4.5L6 6.5h4.5z" />
                    </svg>
                  </div>
                  <span className="text-xs text-gray-400">Build My Own…</span>
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

      <SkinStudioModal
        open={studioOpen}
        onClose={() => setStudioOpen(false)}
        programId={programId}
        programTitle={programTitle}
        initialSkin={studioInitialSkin}
        onSkinSaved={handleSkinSaved}
      />
    </>
  );
}
