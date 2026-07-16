/**
 * Central default constants for the knowledge-grounding engine. Kept as
 * runtime values (not type aliases) so they live outside src/lib/types/.
 * Every number here is a starting value meant to be tuned through evaluation.
 */

import type { KnowledgeFieldWeights } from "../types/index.js";

/** Field weights for the lexical scorer: title/alias matches outrank body. */
export const DEFAULT_FIELD_WEIGHTS: KnowledgeFieldWeights = {
  title: 5,
  aliases: 5,
  keywords: 3,
  summary: 3,
  body: 1,
};

/** How many scored candidates enter relationship expansion / assembly. */
export const DEFAULT_CANDIDATE_LIMIT = 24;
/** How many primary entries survive into the assembled context. */
export const DEFAULT_RESULT_LIMIT = 8;
/** Cap on relationship-expanded entries added after primary retrieval. */
export const DEFAULT_RELATION_LIMIT = 4;

/** Additive boost for an exact entry-id / configuration-key match (dominant). */
export const DEFAULT_EXACT_BOOST = 100;
/** Additive boost for an exact reviewed-alias phrase match (very high). */
export const DEFAULT_ALIAS_BOOST = 60;

/** Grounding-context token budget. */
export const DEFAULT_MAX_CONTEXT_TOKENS = 4000;
/** Hard ceiling for one grounding operation before it fails open. */
export const DEFAULT_TIMEOUT_MS = 800;
/** Bounded recent-turn window used to contextualize the query. */
export const DEFAULT_RECENT_TURNS = 4;
