import { isImageGenerationModel } from "./constants.js";
import type { RequestKind, RequestKindInput } from "../types/index.js";

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
 *   3. tts.enabled without tts.useAiResponse — direct synthesis, bypassing
 *      the LLM turn entirely (useAiResponse means the LLM's own text
 *      response gets synthesized afterward, which is NOT this branch).
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

  if (options.tts?.enabled && !options.tts?.useAiResponse) {
    return "tts-direct";
  }

  return "text";
}
