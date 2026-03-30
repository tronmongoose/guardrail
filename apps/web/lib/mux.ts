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

/**
 * Check if Mux signed playback is configured.
 * When true, new uploads use "signed" policy and the player needs JWT tokens.
 *
 * Required env vars:
 *   MUX_SIGNING_KEY_ID     — Key ID from Mux dashboard → Settings → Signing Keys
 *   MUX_SIGNING_PRIVATE_KEY — Base64-encoded RSA private key from the same page
 */
export function isMuxSigningConfigured(): boolean {
  return !!(process.env.MUX_SIGNING_KEY_ID && process.env.MUX_SIGNING_PRIVATE_KEY);
}

/**
 * Issue a short-lived signed JWT for a Mux playback ID.
 * Tokens expire after 12 hours — suitable for server-rendered pages.
 *
 * Only call this when isMuxSigningConfigured() === true.
 */
export async function signMuxPlaybackId(playbackId: string): Promise<string> {
  const tokenId = process.env.MUX_TOKEN_ID;
  const tokenSecret = process.env.MUX_TOKEN_SECRET;
  const signingKeyId = process.env.MUX_SIGNING_KEY_ID;
  const privateKey = process.env.MUX_SIGNING_PRIVATE_KEY;

  if (!tokenId || !tokenSecret || !signingKeyId || !privateKey) {
    throw new Error("Mux signing is not fully configured");
  }

  // Create a one-off client with signing keys — not cached because the
  // signing keys are not needed for the main API singleton.
  const mux = new Mux({
    tokenId,
    tokenSecret,
    jwtSigningKey: signingKeyId,
    jwtPrivateKey: privateKey,
  });

  return mux.jwt.signPlaybackId(playbackId, {
    type: "video",
    expiration: "12h",
  });
}
