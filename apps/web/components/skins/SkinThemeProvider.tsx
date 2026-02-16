"use client";

import { createContext, useContext } from "react";
import type { SkinTokens } from "@guide-rail/shared";
import { getTokenCSSVars } from "@/lib/skin-bridge";

const SkinTokensContext = createContext<SkinTokens | null>(null);

/**
 * Provides SkinTokens to client components via React Context and
 * applies all token CSS vars to a wrapper div for FOUC-free theming.
 *
 * Usage (in a server component):
 *   <SkinThemeProvider tokens={tokens}>
 *     <ClientComponent />
 *   </SkinThemeProvider>
 */
export function SkinThemeProvider({
  tokens,
  children,
}: {
  tokens: SkinTokens;
  children: React.ReactNode;
}) {
  const cssVars = getTokenCSSVars(tokens);

  return (
    <SkinTokensContext.Provider value={tokens}>
      <div style={cssVars as React.CSSProperties} data-skin={tokens.id}>
        {children}
      </div>
    </SkinTokensContext.Provider>
  );
}

/**
 * Access the current skin tokens from client components.
 * Must be used within a SkinThemeProvider.
 */
export function useSkinTokens(): SkinTokens {
  const tokens = useContext(SkinTokensContext);
  if (!tokens) {
    throw new Error("useSkinTokens must be used within a SkinThemeProvider");
  }
  return tokens;
}
