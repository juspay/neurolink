/**
 * Types backing the static media-handler catalog
 * (src/lib/factories/mediaHandlerCatalog.ts) — the single source of truth
 * for provider names/aliases across the six media-generation ecosystems
 * (TTS, STT, Realtime, Video, Avatar, Music).
 */

export type MediaHandlerKind =
  | "tts"
  | "stt"
  | "realtime"
  | "video"
  | "avatar"
  | "music";

export type MediaHandlerDescriptor = {
  readonly kind: MediaHandlerKind;
  readonly name: string;
  readonly aliases?: readonly string[];
};
