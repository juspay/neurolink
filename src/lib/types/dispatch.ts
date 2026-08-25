/**
 * Types backing resolveRequestKind() (src/lib/core/resolveRequestKind.ts) —
 * the single function that decides which of NeuroLink's output modes a
 * generate/stream request is asking for.
 */

export type RequestKind =
  | "text"
  | "image"
  | "video"
  | "music"
  | "avatar"
  | "tts-direct"
  | "ppt";

/**
 * Narrow structural subset of TextGenerationOptions/GenerateOptions that
 * resolveRequestKind() actually reads. Kept intentionally minimal (rather
 * than importing the full options type) so this module has no dependency
 * on the wider options type graph.
 */
export type RequestKindInput = {
  output?: {
    mode?: string;
    format?: string;
  };
  tts?: {
    enabled?: boolean;
    useAiResponse?: boolean;
  };
};
