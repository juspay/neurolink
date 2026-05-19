/**
 * Generation, streaming, embedding, and middleware-composition primitives.
 *
 * Today these resolve through the upstream generation library; this file is
 * the only internal source so the implementation can be replaced without
 * touching call sites.
 */

export {
  generateText,
  streamText,
  generateObject,
  streamObject,
  embed,
  embedMany,
  wrapLanguageModel,
  experimental_transcribe,
} from "ai";
