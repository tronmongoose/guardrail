import { describe, it, expect } from "vitest";
import { clusterEmbeddings } from "@guide-rail/ai";

describe("clusterEmbeddings", () => {
  it("returns empty array for empty input", () => {
    expect(clusterEmbeddings([])).toEqual([]);
  });

  it("clusters single item into one cluster", () => {
    const result = clusterEmbeddings([{ contentId: "v1", embedding: [1, 0, 0] }], 1);
    expect(result).toHaveLength(1);
    expect(result[0].contentIds).toEqual(["v1"]);
  });

  it("produces deterministic output across runs", () => {
    const inputs = [
      { contentId: "v1", embedding: [1, 0, 0] },
      { contentId: "v2", embedding: [0.9, 0.1, 0] },
      { contentId: "v3", embedding: [0, 0, 1] },
      { contentId: "v4", embedding: [0, 0.1, 0.9] },
    ];

    const run1 = clusterEmbeddings(inputs, 2);
    const run2 = clusterEmbeddings(inputs, 2);
    const run3 = clusterEmbeddings(inputs, 2);

    expect(run1).toEqual(run2);
    expect(run2).toEqual(run3);
  });

  it("respects k parameter", () => {
    const inputs = Array.from({ length: 9 }, (_, i) => ({
      contentId: `v${i}`,
      embedding: Array.from({ length: 3 }, () => Math.sin(i)),
    }));

    const result = clusterEmbeddings(inputs, 3);
    expect(result.length).toBeLessThanOrEqual(3);
    // All video IDs accounted for
    const allIds = result.flatMap((c) => c.contentIds).sort();
    expect(allIds).toEqual(inputs.map((i) => i.contentId).sort());
  });

  it("assigns each video to exactly one cluster", () => {
    const inputs = [
      { contentId: "a", embedding: [1, 0] },
      { contentId: "b", embedding: [0, 1] },
      { contentId: "c", embedding: [1, 1] },
    ];
    const result = clusterEmbeddings(inputs, 2);
    const allIds = result.flatMap((c) => c.contentIds);
    expect(new Set(allIds).size).toBe(allIds.length);
  });
});
