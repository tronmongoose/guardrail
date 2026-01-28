/**
 * Deterministic k-means clustering for video embeddings.
 *
 * Uses a fixed-seed initialization (first-k selection) for stable results.
 * k defaults to program durationWeeks or ceil(videoCount / 3).
 */

export interface ClusterInput {
  videoId: string;
  embedding: number[];
}

export interface ClusterOutput {
  clusterId: number;
  videoIds: string[];
}

export function clusterEmbeddings(
  inputs: ClusterInput[],
  k?: number
): ClusterOutput[] {
  const n = inputs.length;
  if (n === 0) return [];

  const numClusters = k ?? Math.max(1, Math.min(n, Math.ceil(n / 3)));

  if (n <= numClusters) {
    return inputs.map((inp, i) => ({
      clusterId: i,
      videoIds: [inp.videoId],
    }));
  }

  const dim = inputs[0].embedding.length;

  // Fixed-seed init: pick evenly spaced inputs as initial centroids
  const centroids: number[][] = [];
  for (let i = 0; i < numClusters; i++) {
    const idx = Math.floor((i * n) / numClusters);
    centroids.push([...inputs[idx].embedding]);
  }

  const assignments = new Array<number>(n).fill(0);
  const maxIter = 50;

  for (let iter = 0; iter < maxIter; iter++) {
    let changed = false;

    // Assign
    for (let i = 0; i < n; i++) {
      let bestCluster = 0;
      let bestDist = Infinity;
      for (let c = 0; c < numClusters; c++) {
        const dist = euclideanDistSq(inputs[i].embedding, centroids[c]);
        if (dist < bestDist) {
          bestDist = dist;
          bestCluster = c;
        }
      }
      if (assignments[i] !== bestCluster) {
        assignments[i] = bestCluster;
        changed = true;
      }
    }

    if (!changed) break;

    // Update centroids
    for (let c = 0; c < numClusters; c++) {
      const members = inputs.filter((_, i) => assignments[i] === c);
      if (members.length === 0) continue;
      for (let d = 0; d < dim; d++) {
        centroids[c][d] =
          members.reduce((sum, m) => sum + m.embedding[d], 0) / members.length;
      }
    }
  }

  // Build output, stable ordering by first videoId appearance
  const clusterMap = new Map<number, string[]>();
  for (let i = 0; i < n; i++) {
    const c = assignments[i];
    if (!clusterMap.has(c)) clusterMap.set(c, []);
    clusterMap.get(c)!.push(inputs[i].videoId);
  }

  return Array.from(clusterMap.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([clusterId, videoIds]) => ({ clusterId, videoIds }));
}

function euclideanDistSq(a: number[], b: number[]): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const d = a[i] - b[i];
    sum += d * d;
  }
  return sum;
}
