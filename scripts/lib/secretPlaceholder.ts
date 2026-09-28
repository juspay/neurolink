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
 * `#` inside a string or URL fragment is not one.
 *
 * A fourth shape was wrong too: an opener that follows whitespace INSIDE a
 * quoted string (`const note = " // example"; const key = "AKIA…";`) was
 * still taken as a real comment, so its marker suppressed a real key later
 * on the line. Comment openers are now only recognised outside quoted string
 * spans. (A quote character inside an actual comment can still open a bogus
 * "string" for the rest of the line — harmless here, since a `//`/`#`
 * opener found before that point already spans to the end of the line.)
 *
 * A fifth shape was wrong too: a trailing comment applied to EVERY secret
 * match before it on the line, so `const real = "AKIA…"; const decoy =
 * "AKIA…"; // placeholder` hid the real key just for sharing a line with an
 * annotated decoy. A trailing comment now applies only to the single match
 * closest to it — the one the annotation is actually next to.
 *
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

/** A comment's bounds on the line: `[start, end)`, `end` exclusive. */
type CommentSpan = { start: number; end: number };

/**
 * Spans of quoted string literals (`"`, `'`, or `` ` ``) on `content`, so a
 * comment opener found inside one — typed into a string value, not actual
 * code — is not mistaken for a real comment start. Escapes (`\"`, `\\`) are
 * honored; an unterminated string runs to the end of the line, which is
 * conservative here (it only ever hides a comment opener that was inside
 * the unterminated string anyway).
 */
function stringLiteralSpans(content: string): CommentSpan[] {
  const spans: CommentSpan[] = [];
  let i = 0;
  while (i < content.length) {
    const quote = content[i];
    if (quote !== '"' && quote !== "'" && quote !== "`") {
      i += 1;
      continue;
    }
    const start = i;
    i += 1;
    while (i < content.length && content[i] !== quote) {
      i += content[i] === "\\" ? 2 : 1;
    }
    i = Math.min(i + 1, content.length);
    spans.push({ start, end: i });
  }
  return spans;
}

/**
 * Every comment span on `content`, left to right. A block comment is
 * bounded by its own close — never the rest of the line, so unrelated code
 * after a closed `/* ... *‍/` is not swept in — and scanning continues past
 * it for another opener. A `//`/`#` opener has no close: it runs to the end
 * of the line, and nothing can follow it, so scanning stops there. An
 * unclosed block comment falls back to the same end-of-line behaviour. An
 * opener inside a quoted string span is not a comment at all: scanning
 * continues past it for the next candidate.
 */
function allCommentSpans(content: string): CommentSpan[] {
  const stringSpans = stringLiteralSpans(content);
  const isQuoted = (pos: number) =>
    stringSpans.some((s) => pos >= s.start && pos < s.end);
  const spans: CommentSpan[] = [];
  let searchFrom = 0;
  while (searchFrom <= content.length) {
    const rest = content.slice(searchFrom);
    const opener = COMMENT_OPENER.exec(rest);
    if (!opener) {
      break;
    }
    const openerText = opener[1] ?? "";
    const start = searchFrom + opener.index + opener[0].length - openerText.length;
    if (isQuoted(start)) {
      searchFrom = start + openerText.length;
      continue;
    }
    if (openerText === "/*") {
      const close = content.indexOf("*/", start);
      if (close !== -1) {
        spans.push({ start, end: close + 2 });
        searchFrom = close + 2;
        continue;
      }
    }
    spans.push({ start, end: content.length });
    break;
  }
  return spans;
}

/**
 * The comment that applies to a secret occupying `[start, end)` — one whose
 * span contains that range (the secret sits inside the comment, however far
 * before it the comment opened), or one that trails it (`span.start >=
 * end`) AND is closer to this match than to any other secret match on the
 * line. A trailing annotation names the key next to it, not every earlier
 * key that happens to share the line — `otherStarts` is every other match's
 * start, so a trailing span is withheld when a nearer match would claim it
 * instead. A comment entirely before the secret and already closed — the
 * original bug this guarded against — satisfies neither and is skipped.
 */
function applicableCommentSpan(
  spans: readonly CommentSpan[],
  start: number,
  end: number,
  otherStarts: readonly number[],
): CommentSpan | undefined {
  return spans.find((span) => {
    if (start >= span.start && start < span.end) {
      return true;
    }
    if (span.start < end) {
      return false;
    }
    // A trailing span: only the match closest to it (no other match sits
    // between this one and the span) may treat it as its own annotation.
    return !otherStarts.some((other) => other > start && other < span.start);
  });
}

/**
 * True when every secret the pattern matches on `content` is a placeholder,
 * judged per match from its own token and the one comment that applies to
 * it — one it sits inside, or one that trails it on the same line and is
 * not closer to another match. A secret is a placeholder only when a marker
 * word is in its own token or in that comment — being commented out is not,
 * by itself, evidence that a key is fake, and a comment that closed before
 * reaching this secret never taints it. A line with any real secret is kept
 * even when another match on it is a placeholder.
 */
export function isPlaceholderSecret(content: string, pattern: string): boolean {
  const spans = allCommentSpans(content);
  const re = new RegExp(pattern, "g");
  const matches: { start: number; end: number; secret: string }[] = [];
  let match: RegExpExecArray | null;
  while ((match = re.exec(content)) !== null) {
    const secret = match[0];
    if (secret.length === 0) {
      re.lastIndex += 1;
      continue;
    }
    matches.push({ start: match.index, end: match.index + secret.length, secret });
  }
  const starts = matches.map((m) => m.start);
  for (const { start, end, secret } of matches) {
    const applicable = applicableCommentSpan(
      spans,
      start,
      end,
      starts.filter((s) => s !== start),
    );
    const scope =
      `${secret} ${applicable ? content.slice(applicable.start, applicable.end) : ""}`.toLowerCase();
    const isPlaceholder =
      MARKERS.some((marker) => scope.includes(marker)) ||
      FILLER.test(secret.toLowerCase());
    if (!isPlaceholder) {
      return false;
    }
  }
  return true;
}
