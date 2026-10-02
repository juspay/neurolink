import { isImageGenerationModel } from "./constants.js";
import type {
  RequestKind,
  RequestKindInput,
  RequestKindTTSInput,
  TTSSynthesisMode,
} from "../types/index.js";

/**
 * Which text a `generate({ tts })` request synthesizes. An explicit
 * `tts.mode` wins; otherwise the legacy `useAiResponse` flag decides, and the
 * absence of both means `"direct"` — the documented default that every
 * "speak this text" caller relies on.
 *
 * Every precedence site (this module, `BaseProvider.synthesizeAIResponseIfNeeded`,
 * `NeuroLink.attemptMCPGeneration`, the AI Studio generate() override) reads
 * the answer from here so the rule cannot drift between them.
 */
export function resolveTTSMode(
  tts: RequestKindTTSInput | undefined,
): TTSSynthesisMode {
  if (tts?.mode === "direct" || tts?.mode === "response") {
    return tts.mode;
  }
  return tts?.useAiResponse ? "response" : "direct";
}

/**
 * True when TTS is enabled and the request wants the input text synthesized,
 * bypassing the LLM turn. `enabled` is tested for truthiness, as the dispatch
 * it replaced did and as `synthesizeAIResponseIfNeeded` still does: a caller
 * off the declared type (`enabled: 1`, `"true"`) reaches the same branch at
 * every site rather than being routed to a model call by one of them.
 */
export function isDirectTTSRequest(
  tts: RequestKindTTSInput | undefined,
): boolean {
  return Boolean(tts?.enabled) && resolveTTSMode(tts) === "direct";
}

/**
 * The dispatch decision for "what kind of request is this" — text, image,
 * video, music, avatar, direct TTS synthesis, or PPT generation — at the
 * CORE call sites: neurolink.ts's maybeHandleEarlyGenerateResult
 * (music/avatar/ppt/workflow routing) and baseProvider.ts's
 * stream()/runGenerateInActiveContext (image/video/tts-direct routing) call
 * this instead of independently re-deriving the decision.
 *
 * Also the only copy at the provider-override level: replicate.ts's
 * generate() override and googleVertex/client.ts's generate()/stream()
 * overrides (which bypass BaseProvider's paths) call this too, so an edit
 * to this precedence table reaches every dispatch site.
 *
 * Precedence, checked in order:
 *   1. output.mode (music/avatar/video/ppt) — an explicit mode always wins.
 *   2. an image-generation model, unless the caller explicitly asked for a
 *      non-image output.format (json/structured/text) — this lets dual-mode
 *      models like gemini-3.1-flash-image-preview still perform text or
 *      structured generation when requested.
 *   3. tts.enabled with `resolveTTSMode()` answering "direct" — i.e. no
 *      `mode: "response"` and no legacy `useAiResponse: true` — direct
 *      synthesis, bypassing the LLM turn entirely (response mode means the
 *      LLM's own text gets synthesized afterward, which is NOT this branch).
 *   4. otherwise, "text".
 */
export function resolveRequestKind(
  options: RequestKindInput,
  modelName?: string,
): RequestKind {
  if (options.output?.mode === "music") {
    return "music";
  }
  if (options.output?.mode === "avatar") {
    return "avatar";
  }
  if (options.output?.mode === "video") {
    return "video";
  }
  if (options.output?.mode === "ppt") {
    return "ppt";
  }

  const requestsNonImageOutput =
    options.output?.format === "json" ||
    options.output?.format === "structured" ||
    options.output?.format === "text";
  if (isImageGenerationModel(modelName) && !requestsNonImageOutput) {
    return "image";
  }

  if (isDirectTTSRequest(options.tts)) {
    return "tts-direct";
  }

  return "text";
}
