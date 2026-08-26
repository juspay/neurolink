/**
 * Path sandboxing — types.
 *
 * One shape, used by every guard that has to answer "may this path be
 * touched?": the resolved real path, or the reason it was refused. A
 * discriminated result rather than a thrown error, because a refusal is an
 * ordinary answer a tool turns into recovery text, not an exceptional one.
 *
 * Naming: `file.ts` already owns `FilePath*`, so this carries the
 * `PathSandbox` prefix (Critical Rule 9).
 */

/**
 * Outcome of a containment check. Exactly one branch is present, so a caller
 * that forgets to check `error` cannot accidentally read a path that was
 * refused.
 */
export type PathSandboxResult =
  | { path: string; error?: undefined }
  | { path?: undefined; error: string };
