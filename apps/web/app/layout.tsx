import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GuideRail — Guided Learning Programs",
  description: "Premium instructor-led programs built from your content.",
};

const hasClerk = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const body = (
    <html lang="en">
      <body className="min-h-screen flex flex-col">
        {children}
      </body>
    </html>
  );

  if (hasClerk) {
    return <ClerkProvider>{body}</ClerkProvider>;
  }

  return body;
}
