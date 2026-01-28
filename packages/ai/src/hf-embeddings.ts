/**
 * Hugging Face Inference API — embeddings.
 *
 * Default model: sentence-transformers/all-MiniLM-L6-v2 (384-dim, fast, free-tier friendly)
 * Override via HF_EMBEDDING_MODEL env var.
 */

const DEFAULT_MODEL = "sentence-transformers/all-MiniLM-L6-v2";
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;

interface EmbeddingResult {
  videoId: string;
  text: string;
  embedding: number[];
}

export async function getEmbeddings(
  inputs: { videoId: string; text: string }[]
): Promise<EmbeddingResult[]> {
  const token = process.env.HUGGINGFACEHUB_API_TOKEN;
  if (!token) throw new Error("HUGGINGFACEHUB_API_TOKEN not set");

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
