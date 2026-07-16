/**
 * Public runtime exports for the knowledge-grounding engine.
 *
 * Per the repo convention, this module barrel re-exports only runtime values
 * (classes and functions). All knowledge types flow through the canonical
 * types barrel (`../types/index.js`) and are re-exported from the package root
 * alongside every other public type.
 */

export { KnowledgeGroundingEngine } from "./engine.js";
export {
  manifestToSources,
  normalizeAndValidate,
  resolveEntry,
} from "./resolve.js";
export {
  buildDocument,
  buildIndexSnapshot,
  KnowledgeLexicalIndex,
} from "./knowledgeIndex.js";
export { assembleKnowledgeContext } from "./context.js";
export { retrieve } from "./retrieval.js";
export { normalizePhrases, normalizeText, tokenize } from "./normalize.js";
export {
  DEFAULT_ALIAS_BOOST,
  DEFAULT_CANDIDATE_LIMIT,
  DEFAULT_EXACT_BOOST,
  DEFAULT_FIELD_WEIGHTS,
  DEFAULT_MAX_CONTEXT_TOKENS,
  DEFAULT_TIMEOUT_MS,
  DEFAULT_RECENT_TURNS,
  DEFAULT_RELATION_LIMIT,
  DEFAULT_RESULT_LIMIT,
} from "./defaults.js";
