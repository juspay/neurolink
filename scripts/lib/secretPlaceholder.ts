/**
 * Placeholder classification for the fallback secret scanner in
 * `scripts/security-check.ts` (used when gitleaks is not installed).
 *
 * A match is a placeholder when a marker word appears in the matched secret
 * ITSELF (`"your-api-key-here"`, `sk-test-…`) or in a comment on the same
 * line (`AKIA… // placeholder, not a real key`). Nothing else on the line
 * counts: a real key on a line that also contains `test`, `.replace(` or
 * `here` in code is still a finding. The two earlier shapes of this check
 * were both wrong — inspecting only the text before the first colon meant a
 * `KEY: "value"` line could never be recognised as a placeholder, and
 * inspecting the whole line let any generic word on it hide a real key.
 *
 * A third shape was wrong too: taking the first `//` or `#` on the line as
 * the comment start. The `//` of a URL earlier on the line then became the
 * "comment", and `fetch("https://api.example.com/v1", { Authorization:
 * "Bearer sk-…" })` was skipped because `example` sat in the host. A comment
 * opener now counts only at the start of the line or after whitespace; a
 * `#` inside a string or URL fragment is not one. (A `#` after whitespace
 * inside a string is still taken as a comment — the residual is accepted.)
 * HTML comments are not recognised at all: the scanner walks js/ts/json,
 * and a `<!--` alternative is the pattern CodeQL flags as bad HTML filtering.
 */

const MARKERS = [
  "your-",
  "example",
  "placeholder",
  "dummy",
  "test",
  "sample",
  "xxx",
  "replace",
  "here",
  "not-real",
  "not a real",
  "fake",
] as const;

/** A run of filler characters, e.g. `xxxxxxxxxxxx` or `----------`. */
const FILLER = /^[x\-_=<>[\]{}()]{10,}$/;

/**
 * Where a comment starts on a source line: `//`, `#` or `/*` at the start of
 * the line or after whitespace. The opener is captured so its offset can be
 * recovered from the match without the leading whitespace.
 */
const COMMENT_OPENER = /(?:^|\s)(\/\/|#|\/\*)/;

/**
 * `rg --no-heading --line-number` prints `path:line:content`; the content may
 * itself contain colons, so it is everything after the second one.
 */
export function splitRgMatch(
  match: string,
): { path: string; line: string; content: string } | null {
  const [path, line, ...rest] = match.split(":");
  if (path === undefined || line === undefined || rest.length === 0) {
    return null;
  }
  return { path, line, content: rest.join(":") };
}

/** The comment span of `content` — from its opener to the end of the line — or `""` when there is none. */
function commentSpanOf(content: string): string {
  const opener = COMMENT_OPENER.exec(content);
  if (!opener) {
    return "";
  }
  const openerText = opener[1] ?? "";
  return content.slice(opener.index + opener[0].length - openerText.length);
}

/**
 * True when the secret the pattern matched on `content` is a placeholder,
 * judged from the matched token and the line's comment only. A secret that
 * sits inside the comment span is a placeholder only when a marker word is
 * in that comment — being commented out is not, by itself, evidence that a
 * key is fake.
 */
export function isPlaceholderSecret(content: string, pattern: string): boolean {
  const secret = new RegExp(pattern).exec(content)?.[0] ?? "";
  if (secret.length === 0) {
    return true;
  }
  const scope = `${secret} ${commentSpanOf(content)}`.toLowerCase();
  return (
    MARKERS.some((marker) => scope.includes(marker)) ||
    FILLER.test(secret.toLowerCase())
  );
}
