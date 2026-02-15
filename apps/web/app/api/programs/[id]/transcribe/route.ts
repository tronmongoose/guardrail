import { NextRequest, NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { transcribeAudio } from "@guide-rail/ai";

const MAX_AUDIO_BASE64_SIZE = 4 * 1024 * 1024; // 4MB

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: programId } = await params;
  const user = await getOrCreateUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const program = await prisma.program.findUnique({
    where: { id: programId },
    select: { creatorId: true },
  });

  if (!program) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (program.creatorId !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { audioBase64, chunkIndex, totalChunks, filename } = body;

  if (!audioBase64 || typeof audioBase64 !== "string") {
    return NextResponse.json({ error: "Missing audioBase64" }, { status: 400 });
  }

  if (audioBase64.length > MAX_AUDIO_BASE64_SIZE) {
    return NextResponse.json({ error: "Audio chunk too large" }, { status: 413 });
  }

  try {
    const audioBuffer = Buffer.from(audioBase64, "base64");

    const result = await transcribeAudio({
      audioBuffer,
      filename: filename || `chunk-${chunkIndex ?? 0}.wav`,
    });

    return NextResponse.json({
      text: result.text,
      chunkIndex: chunkIndex ?? 0,
      totalChunks: totalChunks ?? 1,
    });
  } catch (error) {
    console.error("[transcribe] Whisper transcription failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Transcription failed" },
      { status: 500 }
    );
  }
}
