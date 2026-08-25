import type {
  MediaHandlerDescriptor,
  MediaHandlerKind,
} from "../types/index.js";

/**
 * Static catalog of every shipped media-handler provider, across all six
 * ecosystems (TTS, STT, Realtime, Video, Avatar, Music). Pure data — no
 * factory functions, no class imports — mirroring the
 * src/lib/factories/providerDescriptors.ts pattern for text/image
 * providers.
 *
 * Entries mirror providerRegistry.ts's hand-constructed TTS/STT/Realtime/
 * Video/Avatar/Music registration blocks (registerAllProviders()) exactly —
 * this file states today's truth, not an aspirational shape. Keep it in
 * sync if those blocks change.
 */
export const MEDIA_HANDLER_CATALOG: readonly MediaHandlerDescriptor[] = [
  // --- TTS ---
  { kind: "tts", name: "google-ai", aliases: ["vertex"] },
  { kind: "tts", name: "openai-tts" },
  { kind: "tts", name: "elevenlabs", aliases: ["elevenlabs-tts"] },
  { kind: "tts", name: "azure-tts" },
  { kind: "tts", name: "fish-audio" },
  { kind: "tts", name: "cartesia" },
  // --- STT ---
  { kind: "stt", name: "whisper", aliases: ["openai-stt"] },
  { kind: "stt", name: "deepgram" },
  { kind: "stt", name: "google-stt" },
  { kind: "stt", name: "azure-stt" },
  // --- Realtime ---
  { kind: "realtime", name: "openai-realtime" },
  { kind: "realtime", name: "gemini-live" },
  // --- Video ---
  { kind: "video", name: "vertex" },
  { kind: "video", name: "kling" },
  { kind: "video", name: "runway" },
  { kind: "video", name: "replicate" },
  // --- Avatar ---
  { kind: "avatar", name: "d-id" },
  { kind: "avatar", name: "replicate", aliases: ["musetalk"] },
  { kind: "avatar", name: "heygen" },
  // --- Music ---
  { kind: "music", name: "beatoven" },
  { kind: "music", name: "replicate", aliases: ["musicgen"] },
  { kind: "music", name: "elevenlabs-music", aliases: ["elevenlabs-sound"] },
  { kind: "music", name: "lyria" },
] as const;

/** Every selectable provider name for `kind`, primaries and aliases both. */
export function providerChoicesFor(kind: MediaHandlerKind): string[] {
  const choices: string[] = [];
  for (const entry of MEDIA_HANDLER_CATALOG) {
    if (entry.kind !== kind) {
      continue;
    }
    choices.push(entry.name);
    if (entry.aliases) {
      choices.push(...entry.aliases);
    }
  }
  return choices;
}

/** The first-listed primary provider name for `kind` — used as a fallback default. */
export function defaultProviderFor(kind: MediaHandlerKind): string {
  const first = MEDIA_HANDLER_CATALOG.find((entry) => entry.kind === kind);
  if (!first) {
    throw new Error(
      `No media handler catalog entries registered for kind "${kind}"`,
    );
  }
  return first.name;
}
