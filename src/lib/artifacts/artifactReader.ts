/**
 * Artifact reading primitives shared by every backend and every reader.
 *
 * Two readers exist — the model's `retrieve_context({ artifactId })` and the
 * host's `readArtifact()` — and two shipped backends. Everything they agree
 * on lives here so it is agreed on exactly once:
 *
 *  - `readArtifactWindow` is THE paged read. It asks a backend for a window
 *    when the backend can produce one (`retrieveRange`), and otherwise reads
 *    the whole payload and slices. A reader never has to know which.
 *  - `searchArtifactContent` is the literal search over an artifact. It
 *    returns bounded snippets with character offsets, never whole lines:
 *    an MCP artifact is usually one compact JSON line, so "the matching line"
 *    would be the payload the search was meant to avoid reading.
 *  - `isSafeArtifactId` is the shape check every backend applies before an
 *    id reaches a path or a key. Ids arrive from the model.
 *
 * @module artifacts/artifactReader
 */

import type {
  ArtifactPageRequest,
  ArtifactSearchMatch,
  ArtifactSearchResult,
  ArtifactStore,
  ArtifactWindow,
} from "../types/index.js";

/** Characters used for the quick preview embedded in surrogate results. */
export const DEFAULT_PREVIEW_CHARS = 500;

/** Matches returned by one artifact search; the rest are counted, not sent. */
export const MAX_ARTIFACT_SEARCH_MATCHES = 50;

/** Longest search pattern accepted — bounds the work per call. */
export const MAX_SEARCH_PATTERN_CHARS = 200;

/** Characters kept on each side of a hit in its snippet. */
const SNIPPET_CONTEXT_CHARS = 120;

/**
 * Ids that may be turned into a path or a key.
 *
 * Ids reach the backends straight from the model through `retrieve_context`.
 * No dots and no separators means `../../etc/passwd` can never become a file
 * probe, and no glob characters means an id can never widen a key pattern.
 * Real ids are UUIDs.
 */
const SAFE_ARTIFACT_ID = /^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/;

/** True when `id` is shaped like something a backend may look up. */
export function isSafeArtifactId(id: string): boolean {
  return SAFE_ARTIFACT_ID.test(id);
}

/** Head slice of a payload for surrogate headers, ellipsised when cut. */
export function generateArtifactPreview(
  payload: string,
  chars: number = DEFAULT_PREVIEW_CHARS,
): string {
  if (payload.length <= chars) {
    return payload;
  }
  return `${payload.slice(0, chars)}…`;
}

/** Cut one window out of a payload already in memory. */
export function sliceArtifactWindow(
  content: string,
  page?: ArtifactPageRequest,
): ArtifactWindow {
  const offset = Math.max(0, page?.offset ?? 0);
  const limit = page?.limit;
  const window =
    limit === undefined
      ? content.slice(offset)
      : content.slice(offset, offset + Math.max(0, limit));
  return { content: window, offset, totalLength: content.length };
}

/**
 * Read one window of an artifact through whatever the backend supports.
 *
 * With a `page` and a backend that implements `retrieveRange`, only the
 * window crosses the wire. Otherwise the whole payload is fetched and cut
 * here. Without a `page` the whole payload is always fetched — a caller that
 * omits the window is asking for the artifact.
 *
 * Returns `null` when the id is unknown, unsafe, or expired.
 */
export async function readArtifactWindow(
  store: ArtifactStore,
  id: string,
  page?: ArtifactPageRequest,
): Promise<ArtifactWindow | null> {
  if (page && store.retrieveRange) {
    return store.retrieveRange(id, {
      offset: Math.max(0, page.offset ?? 0),
      limit: page.limit === undefined ? undefined : Math.max(0, page.limit),
    });
  }
  const content = await store.retrieve(id);
  if (content === null) {
    return null;
  }
  return sliceArtifactWindow(content, page);
}

/**
 * Why a search pattern cannot be used, or `undefined` when it can.
 *
 * Empty would match at every position; over-long bounds the scan. Both are
 * reported to the model rather than silently ignored — the whole point of
 * the artifact search is that "search did not happen" is never invisible.
 */
export function validateSearchPattern(pattern: string): string | undefined {
  if (pattern.length === 0) {
    return "Search pattern must not be empty";
  }
  if (pattern.length > MAX_SEARCH_PATTERN_CHARS) {
    return `Search pattern too long (max ${MAX_SEARCH_PATTERN_CHARS} chars)`;
  }
  return undefined;
}

/**
 * Literal, case-insensitive search over an artifact.
 *
 * Regex metacharacters in `pattern` are matched literally — the model's
 * input is never compiled as a regex, so it cannot be made catastrophic.
 * Each hit carries the character `offset` of the match (what to pass back as
 * `offset` for a targeted read), its 1-based line, and a bounded snippet.
 *
 * Scanning starts at `from`, so a caller can walk a long payload by passing
 * `nextSearchOffset` back in. Every match after `from` is counted in
 * `totalMatches`; only the first `maxMatches` are returned.
 *
 * `pattern` must already have passed {@link validateSearchPattern}.
 */
export function searchArtifactContent(
  content: string,
  pattern: string,
  options?: { from?: number; maxMatches?: number },
): ArtifactSearchResult {
  const from = Math.max(0, options?.from ?? 0);
  const maxMatches = options?.maxMatches ?? MAX_ARTIFACT_SEARCH_MATCHES;
  const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(escaped, "gi");
  regex.lastIndex = from;

  const matches: ArtifactSearchMatch[] = [];
  let totalMatches = 0;
  let nextSearchOffset: number | undefined;
  // Line numbers are counted incrementally from the start of the payload so
  // the whole scan stays a single pass.
  let line = 1;
  let lineScanPos = 0;

  let match: RegExpExecArray | null;
  while ((match = regex.exec(content)) !== null) {
    totalMatches += 1;
    if (matches.length < maxMatches) {
      for (let i = lineScanPos; i < match.index; i += 1) {
        if (content.charCodeAt(i) === 10) {
          line += 1;
        }
      }
      lineScanPos = match.index;
      const snippetOffset = Math.max(0, match.index - SNIPPET_CONTEXT_CHARS);
      const snippetEnd = Math.min(
        content.length,
        match.index + match[0].length + SNIPPET_CONTEXT_CHARS,
      );
      matches.push({
        offset: match.index,
        line,
        snippetOffset,
        snippet: content.slice(snippetOffset, snippetEnd),
      });
    } else if (nextSearchOffset === undefined) {
      nextSearchOffset = match.index;
    }
    if (match[0].length === 0) {
      // Unreachable for a non-empty pattern; keeps the loop finite regardless.
      regex.lastIndex += 1;
    }
  }

  return {
    matches,
    matchCount: matches.length,
    totalMatches,
    truncated: totalMatches > matches.length,
    ...(nextSearchOffset === undefined ? {} : { nextSearchOffset }),
  };
}
