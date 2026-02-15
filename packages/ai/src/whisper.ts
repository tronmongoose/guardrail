/**
 * Whisper transcription wrapper using raw fetch (matches llm-adapter.ts pattern).
 * No OpenAI SDK dependency needed — uses FormData + Blob natively.
 */

export interface TranscribeOptions {
  /** Audio data as a Buffer (WAV format expected) */
  audioBuffer: Buffer;
  /** Original filename for the API (helps Whisper detect format) */
  filename?: string;
  /** Language hint (ISO 639-1), e.g. "en". Optional — Whisper auto-detects. */
  language?: string;
}

export interface TranscribeResult {
  text: string;
}

export async function transcribeAudio(
  options: TranscribeOptions
): Promise<TranscribeResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY not set");

  const {
    audioBuffer,
    filename = "audio.wav",
    language,
  } = options;

  const formData = new FormData();
  const blob = new Blob([new Uint8Array(audioBuffer)], { type: "audio/wav" });
  formData.append("file", blob, filename);
  formData.append("model", "whisper-1");
  formData.append("response_format", "text");
  if (language) {
    formData.append("language", language);
  }

  const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: formData,
  });

  if (!res.ok) {
    const errorBody = await res.text().catch(() => "");
    throw new Error(`Whisper API error: ${res.status} - ${errorBody}`);
  }

  const text = await res.text();
  return { text: text.trim() };
}
