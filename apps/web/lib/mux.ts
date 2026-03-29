import Mux from "@mux/mux-node";

let muxInstance: Mux | null = null;

/**
 * Get Mux client instance with lazy initialization.
 * Throws only when called, not at module load time.
 */
export function getMux(): Mux {
  if (!muxInstance) {
    const tokenId = process.env.MUX_TOKEN_ID;
    const tokenSecret = process.env.MUX_TOKEN_SECRET;
    if (!tokenId || !tokenSecret) {
      throw new Error("MUX_TOKEN_ID and MUX_TOKEN_SECRET are not configured");
    }
    muxInstance = new Mux({ tokenId, tokenSecret });
  }
  return muxInstance;
}

/**
 * Check if Mux is configured (has API credentials).
 * Use this to conditionally enable/disable Mux features.
 */
export function isMuxConfigured(): boolean {
  return !!(process.env.MUX_TOKEN_ID && process.env.MUX_TOKEN_SECRET);
}
