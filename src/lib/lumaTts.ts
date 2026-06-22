/**
 * Luma speech — OpenAI TTS personas (server-only).
 */

export const LUMA_VOICE_OPTIONS = [
  { id: "shimmer", label: "Warm & gentle", description: "Soft, caring default" },
  { id: "nova", label: "Friendly", description: "Expressive and approachable" },
  { id: "coral", label: "Calm & clear", description: "Steady and reassuring" },
  { id: "alloy", label: "Neutral", description: "Even and balanced" },
] as const;

export type LumaVoiceId = (typeof LUMA_VOICE_OPTIONS)[number]["id"];

const VOICE_IDS = new Set<string>(LUMA_VOICE_OPTIONS.map((v) => v.id));

export function isValidLumaVoice(voice: string): voice is LumaVoiceId {
  return VOICE_IDS.has(voice);
}

export function isLumaTtsConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}

export async function synthesizeLumaSpeech(
  text: string,
  voice: LumaVoiceId
): Promise<ArrayBuffer> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OpenAI API key not configured");
  }

  const input = text.slice(0, 4096);
  const model = process.env.LUMA_TTS_MODEL ?? "tts-1";

  const res = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      input,
      voice,
      speed: 0.92,
      response_format: "mp3",
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI TTS error (${res.status}): ${err.slice(0, 200)}`);
  }

  return res.arrayBuffer();
}
