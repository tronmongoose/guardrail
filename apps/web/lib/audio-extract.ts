/**
 * Client-side audio extraction from video/audio files.
 * Decodes audio using AudioContext, downsamples to 16kHz mono WAV,
 * and chunks into segments that fit within Vercel's 4.5MB payload limit.
 */

/** Maximum audio duration in seconds (5 minutes) */
export const MAX_AUDIO_DURATION_SECONDS = 300;

/** Chunk duration in seconds (90s => ~2.88MB WAV => ~3.8MB base64) */
const CHUNK_DURATION_SECONDS = 90;

/** Target sample rate for Whisper (16kHz is optimal) */
const TARGET_SAMPLE_RATE = 16000;

export interface AudioChunk {
  base64: string;
  index: number;
  durationSeconds: number;
}

export interface AudioExtractionResult {
  chunks: AudioChunk[];
  totalDurationSeconds: number;
  totalChunks: number;
}

/**
 * Extract audio from a video/audio file, downsample to 16kHz mono,
 * and return as base64-encoded WAV chunks.
 */
export async function extractAudioChunks(
  file: File,
  onProgress?: (progress: number) => void
): Promise<AudioExtractionResult> {
  onProgress?.(5);

  const arrayBuffer = await file.arrayBuffer();
  onProgress?.(15);

  const audioContext = new AudioContext();
  let audioBuffer: AudioBuffer;
  try {
    audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
  } finally {
    await audioContext.close();
  }
  onProgress?.(30);

  const totalDuration = audioBuffer.duration;

  if (totalDuration > MAX_AUDIO_DURATION_SECONDS) {
    throw new Error(
      `Audio is ${Math.round(totalDuration / 60)} minutes long. Maximum is ${MAX_AUDIO_DURATION_SECONDS / 60} minutes.`
    );
  }

  // Downsample to 16kHz mono using OfflineAudioContext
  const totalSamples = Math.ceil(totalDuration * TARGET_SAMPLE_RATE);
  const offlineCtx = new OfflineAudioContext(1, totalSamples, TARGET_SAMPLE_RATE);
  const source = offlineCtx.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(offlineCtx.destination);
  source.start(0);
  const resampledBuffer = await offlineCtx.startRendering();
  onProgress?.(50);

  const pcmData = resampledBuffer.getChannelData(0);

  // Chunk and encode as WAV
  const samplesPerChunk = CHUNK_DURATION_SECONDS * TARGET_SAMPLE_RATE;
  const totalChunks = Math.ceil(pcmData.length / samplesPerChunk);
  const chunks: AudioChunk[] = [];

  for (let i = 0; i < totalChunks; i++) {
    const start = i * samplesPerChunk;
    const end = Math.min(start + samplesPerChunk, pcmData.length);
    const chunkPcm = pcmData.subarray(start, end);
    const chunkDuration = chunkPcm.length / TARGET_SAMPLE_RATE;

    const wavBytes = encodeWAV(chunkPcm, TARGET_SAMPLE_RATE);
    const base64 = arrayBufferToBase64(wavBytes);

    chunks.push({ base64, index: i, durationSeconds: chunkDuration });

    onProgress?.(Math.round(50 + ((i + 1) / totalChunks) * 50));
  }

  return { chunks, totalDurationSeconds: totalDuration, totalChunks };
}

/** Encode Float32 PCM samples as a 16-bit mono WAV file. */
function encodeWAV(samples: Float32Array, sampleRate: number): ArrayBuffer {
  const numSamples = samples.length;
  const bytesPerSample = 2;
  const dataSize = numSamples * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  // RIFF header
  writeString(view, 0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, "WAVE");

  // fmt chunk
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * bytesPerSample, true);
  view.setUint16(32, bytesPerSample, true);
  view.setUint16(34, 16, true); // bits per sample

  // data chunk
  writeString(view, 36, "data");
  view.setUint32(40, dataSize, true);

  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    const sample = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
    offset += 2;
  }

  return buffer;
}

function writeString(view: DataView, offset: number, str: string): void {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/** Check if a filename is a supported audio/video type. */
export function isAudioVideoFile(filename: string): boolean {
  const lower = filename.toLowerCase();
  return [".mp4", ".webm", ".mov", ".mp3", ".m4a", ".wav", ".ogg", ".aac"].some(
    (ext) => lower.endsWith(ext)
  );
}
