/**
 * Hugging Face Inference API — embeddings via official SDK.
 *
 * Default model: sentence-transformers/all-MiniLM-L6-v2 (384-dim, fast, free-tier friendly)
 * Override via HF_EMBEDDING_MODEL env var.
 *
 * If HUGGINGFACEHUB_API_TOKEN is not set, uses deterministic stub embeddings for local dev.
 */

import { InferenceClient } from "@huggingface/inference";

const DEFAULT_MODEL = "sentence-transformers/all-MiniLM-L6-v2";
const EMBEDDING_DIM = 384;

interface EmbeddingResult {
  videoId: string;
  text: string;
  embedding: number[];
}

/**
 * Generate deterministic stub embedding from text (for local dev without HF token).
 * Uses simple hash-based approach to create reproducible 384-dim vectors.
 */
function generateStubEmbedding(text: string): number[] {
  const embedding: number[] = [];
  for (let i = 0; i < EMBEDDING_DIM; i++) {
    // Simple deterministic hash combining text chars and position
    let hash = 0;
    for (let j = 0; j < text.length; j++) {
      hash = ((hash << 5) - hash + text.charCodeAt(j) * (i + 1)) | 0;
    }
    // Normalize to [-1, 1] range
    embedding.push(Math.sin(hash) * 0.5 + Math.cos(hash * 0.7) * 0.5);
  }
  return embedding;
}

export async function getEmbeddings(
  inputs: { videoId: string; text: string }[]
): Promise<EmbeddingResult[]> {
  const token = process.env.HUGGINGFACEHUB_API_TOKEN;

  // Stub mode: generate deterministic embeddings without API
  if (!token) {
    console.log("[embeddings] No HF token, using stub embeddings");
    return inputs.map((input) => ({
      videoId: input.videoId,
      text: input.text,
      embedding: generateStubEmbedding(input.text),
    }));
  }

  const model = process.env.HF_EMBEDDING_MODEL || DEFAULT_MODEL;
  const client = new InferenceClient(token);

  const results: EmbeddingResult[] = [];

  // Batch in groups of 16 to respect rate limits
  const batchSize = 16;
  for (let i = 0; i < inputs.length; i += batchSize) {
    const batch = inputs.slice(i, i + batchSize);
    const texts = batch.map((b) => b.text);

    // Use featureExtraction which correctly routes the task
    // even for models tagged as sentence-similarity
    const embeddings = await client.featureExtraction({
      model,
      inputs: texts,
      provider: "hf-inference",
    });

    // Response is number[][] (one embedding per input text)
    const embeddingArrays = embeddings as unknown as number[][];

    for (let j = 0; j < batch.length; j++) {
      results.push({
        videoId: batch[j].videoId,
        text: batch[j].text,
        embedding: embeddingArrays[j],
      });
    }
  }

  return results;
}
