import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";
import { Space_Grotesk, Inter, Fraunces, Nunito, Quicksand } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/ui/toast";
import { GenerationProvider } from "@/components/generation";

// Skin Studio font presets — each preset's token strings reference these
// CSS variables so the font swap applies without a network round-trip.
const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-space-grotesk", display: "swap" });
const inter        = Inter({        subsets: ["latin"], variable: "--font-inter",         display: "swap" });
const fraunces     = Fraunces({     subsets: ["latin"], variable: "--font-fraunces",      display: "swap" });
const nunito       = Nunito({       subsets: ["latin"], variable: "--font-nunito",        display: "swap" });
const quicksand    = Quicksand({    subsets: ["latin"], variable: "--font-quicksand",     display: "swap" });

export const metadata: Metadata = {
  title: "Journeyline — Guided Learning Programs",
  description: "Premium instructor-led programs built from your content.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html
        lang="en"
        className={`${spaceGrotesk.variable} ${inter.variable} ${fraunces.variable} ${nunito.variable} ${quicksand.variable}`}
      >
        <body className="min-h-screen flex flex-col">
          <ToastProvider>
            <GenerationProvider>{children}</GenerationProvider>
          </ToastProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
