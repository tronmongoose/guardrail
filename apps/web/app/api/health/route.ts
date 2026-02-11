import { NextResponse } from "next/server";

// Health check endpoint to verify deployment
export async function GET() {
  return NextResponse.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    version: "2026-02-11-wizard",
    features: {
      wizard: true,
      pdfExtraction: true,
      influencerStyle: true,
      durationPresets: true,
    },
  });
}
