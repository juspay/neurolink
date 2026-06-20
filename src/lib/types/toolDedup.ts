/**
 * Tool signature deduplication types.
 *
 * When many MCP servers are registered, it is common for tools from different
 * servers to be functionally identical — same purpose, same parameters, only a
 * slightly different name or description phrasing.  Sending all of them to the
 * model wastes tokens and can confuse the model into picking the wrong variant.
 *
 * The dedup pass is OPT-IN and FAIL-OPEN.  When disabled (the default) the
 * tool set is returned byte-for-byte unchanged.  Any error in the dedup logic
 * also returns the original tool set.
 */

/** Configuration for the opt-in tool-signature deduplication pass. */
export type ToolDedupConfig = {
  /**
   * Master switch.  Dedup runs only when `true`.
   * Default: `false` (disabled — no change in behaviour).
   */
  enabled?: boolean;

  /**
   * Jaccard similarity threshold in [0, 1].  Pairs of tools whose token-set
   * Jaccard similarity over their canonical signatures meets or exceeds this
   * value are treated as near-duplicates; only one representative per cluster
   * (the first in stable input order) is forwarded to the model.
   *
   * Default: `0.9`
   */
  threshold?: number;
};

/** Record produced for each tool collapsed by the dedup pass. */
export type ToolDedupRemoved = {
  /** Name of the tool that was collapsed. */
  name: string;
  /** Name of the representative tool that this one was collapsed into. */
  duplicateOf: string;
  /** Similarity score that triggered the collapse (in [0, 1]). */
  similarity: number;
};

/** Return type of `dedupeTools()`. */
export type ToolDedupResult<T extends Record<string, unknown>> = {
  /** Deduplicated tool set (or original set when dedup is disabled/errored). */
  tools: T;
  /** Tools that were removed along with the reason. Empty when dedup is off. */
  removed: ToolDedupRemoved[];
};
