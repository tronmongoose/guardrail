"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { GenerationNotification } from "./GenerationNotification";

interface GenerationContextType {
  startGeneration: (programId: string) => void;
  dismissGeneration: (programId: string) => void;
  activeGenerations: string[];
}

const GenerationContext = createContext<GenerationContextType | null>(null);

export function useGeneration() {
  const context = useContext(GenerationContext);
  if (!context) {
    throw new Error("useGeneration must be used within a GenerationProvider");
  }
  return context;
}

interface GenerationProviderProps {
  children: ReactNode;
}

export function GenerationProvider({ children }: GenerationProviderProps) {
  const [activeGenerations, setActiveGenerations] = useState<string[]>([]);

  const startGeneration = useCallback((programId: string) => {
    setActiveGenerations((prev) => {
      if (prev.includes(programId)) return prev;
      return [...prev, programId];
    });
  }, []);

  const dismissGeneration = useCallback((programId: string) => {
    setActiveGenerations((prev) => prev.filter((id) => id !== programId));
  }, []);

  return (
    <GenerationContext.Provider value={{ startGeneration, dismissGeneration, activeGenerations }}>
      {children}

      {/* Render notifications for all active generations */}
      {activeGenerations.map((programId) => (
        <GenerationNotification
          key={programId}
          programId={programId}
          onDismiss={() => dismissGeneration(programId)}
        />
      ))}
    </GenerationContext.Provider>
  );
}
