/**
 * Types backing resolveRequestKind() (src/lib/core/resolveRequestKind.ts) —
 * the single function that decides which of NeuroLink's output modes a
 * generate/stream request is asking for.
 */

import type { TTSSynthesisMode } from "./tts.js";

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
  tts?: RequestKindTTSInput;
};

/**
 * The two `tts` fields that decide between direct synthesis and synthesizing
 * the model's reply. `mode` wins; `useAiResponse` is the legacy spelling.
 */
export type RequestKindTTSInput = {
  enabled?: boolean;
  mode?: TTSSynthesisMode;
  useAiResponse?: boolean;
};
