import { NextRequest, NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getEmbeddings, clusterEmbeddings } from "@guide-rail/ai";

const HF_MODEL = process.env.HF_EMBEDDING_MODEL || "sentence-transformers/all-MiniLM-L6-v2";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: programId } = await params;
  const user = await getOrCreateUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const program = await prisma.program.findUnique({
    where: { id: programId },
    include: { videos: true },
  });
  if (!program || program.creatorId !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (program.videos.length === 0) {
    return NextResponse.json({ error: "No videos to process" }, { status: 400 });
  }

  // Step 1: Get embeddings via HF
  const embeddingInputs = program.videos.map((v) => ({
    videoId: v.id,
    text: `${v.title ?? ""} ${v.description ?? ""}`.trim() || v.videoId,
  }));

  let embeddingResults;
  try {
    embeddingResults = await getEmbeddings(embeddingInputs);
  } catch (err) {
    console.error("HF embedding error:", err);
    return NextResponse.json(
      { error: "Embedding generation failed", detail: String(err) },
      { status: 502 }
    );
  }

  // Step 2: Store embeddings
  for (const result of embeddingResults) {
    await prisma.embedding.upsert({
      where: {
        programId_videoId_model: {
          programId,
          videoId: result.videoId,
          model: HF_MODEL,
        },
      },
      create: {
        programId,
        videoId: result.videoId,
        model: HF_MODEL,
        vector: result.embedding,
      },
      update: {
        vector: result.embedding,
      },
    });
  }

  // Step 3: Cluster
  const clusterInputs = embeddingResults.map((r) => ({
    videoId: r.videoId,
    embedding: r.embedding,
  }));

  const k = Math.min(program.durationWeeks, program.videos.length);
  const clusters = clusterEmbeddings(clusterInputs, k);

  // Step 4: Store cluster assignments
  for (const cluster of clusters) {
    for (const videoId of cluster.videoIds) {
      await prisma.clusterAssignment.upsert({
        where: { programId_videoId: { programId, videoId } },
        create: { programId, videoId, clusterId: cluster.clusterId },
        update: { clusterId: cluster.clusterId },
      });
    }
  }

  // Step 5: Build response with video titles for LLM step
  const videoMap = new Map(program.videos.map((v) => [v.id, v]));
  const clusterResponse = clusters.map((c) => ({
    clusterId: c.clusterId,
    videoIds: c.videoIds,
    videoTitles: c.videoIds.map((vid) => videoMap.get(vid)?.title ?? "Untitled"),
    summary: `Group of ${c.videoIds.length} related video(s)`,
  }));

  return NextResponse.json({ programId, clusters: clusterResponse });
}
