/**
 * Parse Luma plain-text replies into skimmable blocks for display.
 */

export type LumaMessageBlock =
  | { type: "paragraph"; text: string }
  | { type: "bullets"; items: string[] };

const BULLET_LINE = /^\s*(?:[-•*]|\d+[.)])\s+(.+)$/;

/** Split companion text into paragraphs and bullet lists. */
export function parseLumaMessageBlocks(text: string): LumaMessageBlock[] {
  const chunks = text
    .split(/\n{2,}/)
    .map((c) => c.trim())
    .filter(Boolean);

  const blocks: LumaMessageBlock[] = [];

  for (const chunk of chunks) {
    const lines = chunk.split("\n").map((l) => l.trim()).filter(Boolean);
    const bulletItems: string[] = [];
    const proseLines: string[] = [];

    for (const line of lines) {
      const bulletMatch = line.match(BULLET_LINE);
      if (bulletMatch) bulletItems.push(bulletMatch[1].trim());
      else proseLines.push(line);
    }

    if (proseLines.length > 0) {
      blocks.push({ type: "paragraph", text: proseLines.join(" ") });
    }
    if (bulletItems.length > 0) {
      blocks.push({ type: "bullets", items: bulletItems });
    }
  }

  if (blocks.length === 0 && text.trim()) {
    blocks.push({ type: "paragraph", text: text.trim() });
  }

  return blocks;
}

/** Strip markdown-style bullets for TTS. */
export function plainTextForSpeech(text: string): string {
  return text
    .split("\n")
    .map((line) => line.replace(BULLET_LINE, "$1").trim())
    .filter(Boolean)
    .join(". ")
    .replace(/\.\s*\./g, ".")
    .replace(/[—…]/g, ", ")
    .replace(/\s+/g, " ")
    .trim();
}
