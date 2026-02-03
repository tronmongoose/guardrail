/**
 * Hugging Face Inference API — embeddings.
 *
 * Default model: sentence-transformers/all-MiniLM-L6-v2 (384-dim, fast, free-tier friendly)
 * Override via HF_EMBEDDING_MODEL env var.
 *
 * If HUGGINGFACEHUB_API_TOKEN is not set, uses deterministic stub embeddings for local dev.
 */

const DEFAULT_MODEL = "sentence-transformers/all-MiniLM-L6-v2";
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;
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
  const url = `https://api-inference.huggingface.co/pipeline/feature-extraction/${model}`;

  const results: EmbeddingResult[] = [];

  // Batch in groups of 16 to respect rate limits
  const batchSize = 16;
  for (let i = 0; i < inputs.length; i += batchSize) {
    const batch = inputs.slice(i, i + batchSize);
    const texts = batch.map((b) => b.text);

    const embeddings = await fetchWithRetry(url, token, texts);

    for (let j = 0; j < batch.length; j++) {
      results.push({
        videoId: batch[j].videoId,
        text: batch[j].text,
        embedding: embeddings[j],
      });
    }
  }

  return results;
}

async function fetchWithRetry(
  url: string,
  token: string,
  inputs: string[]
): Promise<number[][]> {
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ inputs, options: { wait_for_model: true } }),
    });

    if (res.ok) {
      return res.json();
    }

    if (res.status === 429 || res.status >= 500) {
      const delay = BASE_DELAY_MS * Math.pow(2, attempt);
      await new Promise((r) => setTimeout(r, delay));
      continue;
    }

    throw new Error(`HF API error: ${res.status} ${await res.text()}`);
  }

  throw new Error("HF API: max retries exceeded");
}
