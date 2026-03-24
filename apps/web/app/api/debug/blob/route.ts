import { put, list } from "@vercel/blob";
import { NextResponse } from "next/server";

// Quick diagnostic: tests whether the BLOB_READ_WRITE_TOKEN is valid and
// the Vercel Blob store is reachable from the server.
// Visit http://localhost:3000/api/debug/blob to run it.
export async function GET() {
  const token = process.env.BLOB_READ_WRITE_TOKEN;

  if (!token) {
    return NextResponse.json({ ok: false, step: "env", error: "BLOB_READ_WRITE_TOKEN is not set" }, { status: 500 });
  }

  // Step 1: list blobs — tests auth + network to Vercel Blob API
  try {
    const { blobs } = await list({ limit: 1 });
    // Step 2: write a tiny test file
    try {
      const blob = await put("__debug_test.txt", "ok", { access: "private", addRandomSuffix: true });
      return NextResponse.json({
        ok: true,
        token: token.slice(0, 24) + "…",
        blobCount: blobs.length,
        testUrl: blob.url,
        message: "Vercel Blob is reachable and the token is valid.",
      });
    } catch (putErr) {
      return NextResponse.json({ ok: false, step: "put", error: (putErr as Error).message }, { status: 500 });
    }
  } catch (listErr) {
    return NextResponse.json({ ok: false, step: "list", error: (listErr as Error).message }, { status: 500 });
  }
}
