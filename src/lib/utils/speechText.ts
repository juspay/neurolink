/**
 * Text preparation for speech synthesis.
 *
 * Model output is written for a screen: markdown structure, URLs, emoji.
 * Read aloud, every one of those is noise — "asterisk asterisk", a 90-character
 * URL spelled letter by letter, "grinning face with smiling eyes". This module
 * rewrites such text into what a voice should actually say.
 *
 * Every regular expression here is linear-time by construction: no nested
 * quantifiers, no lazy scan to a closing token, and no unbounded greedy class
 * followed by a required literal (the `[ \t]+\n` shape that goes quadratic on
 * a long run of spaces). Where a closing token is required, the scan between
 * the two is bounded AND excludes the opener's own character, so an unclosed
 * opener fails at the next opener rather than walking the bound — a run of
 * `[` costs one step per character, not one thousand. Block-level structure
 * (fenced code, lists, tables, headings, blockquotes) is a line pass that
 * toggles state, so an unterminated fence costs one scan rather than a
 * backtracking search.
 *
 * @module utils/speechText
 */

// A namespace import, not a named one: the browser bundle replaces every
// `node:` module with a fixed stub that has no `domainToUnicode`, and a named
// import of a missing export fails that build. `hostnameOf` checks for the
// function at runtime and falls back to the punycode form.
import * as nodeUrl from "node:url";

import type {
  ResolvedSpeechSanitizeOptions,
  SpeechSanitizeOptions,
} from "../types/index.js";

const DEFAULT_CODE_BLOCK_PHRASE = "Code block omitted.";

/** A fence opener/closer: up to three spaces of indent, then ``` or ~~~. */
const FENCE_LINE = /^[ \t]{0,3}(?:`{3,}|~{3,})/;
/** ATX heading marker: `#` to `######` followed by whitespace. */
const HEADING_MARKER = /^[ \t]{0,3}#{1,6}[ \t]+/;
/** A line made only of `=`, `-`, `*`, `_` and spaces (setext underline or thematic break). */
const RULE_LINE = /^[ \t]{0,3}[=\-*_][=\-*_ \t]*$/;
/** A line made only of pipes, dashes, colons and spaces (table separator row). */
const TABLE_SEPARATOR_CHARS = /^[|:\- \t]+$/;
/** Unordered list bullet. */
const BULLET_MARKER = /^([ \t]*)[-*+][ \t]+/;
/** Ordered list marker (`1.` / `1)`), bounded to nine digits. */
const ORDERED_MARKER = /^([ \t]*)\d{1,9}[.)][ \t]+/;
/** Task-list checkbox left after a bullet is stripped. */
const TASK_CHECKBOX = /^\[[ xX]\][ \t]+/;
/** One level of blockquote. */
const BLOCKQUOTE_MARKER = /^[ \t]{0,3}>[ \t]?/;

// Inline constructs need a closing token. The span between opener and closer
// is bounded so an unclosed opener never scans to the end of the document.
// The bound alone is not enough: a label class that admits the opener's own
// character makes every `[` in a run of `[` walk the full bound before it
// fails, which is linear with a constant of LINK_TEXT_MAX — 2.6 s per
// megabyte of `[`. Excluding the opener from the class makes the failure
// immediate, so a run of openers costs one step each.
const LINK_TEXT_MAX = 1000;
const LINK_TARGET_MAX = 2048;
const CODE_SPAN_MAX = 1000;
const TAG_BODY_MAX = 500;
const EMPHASIS_SPAN_MAX = 1000;

/** Inline image: `![alt](src)` → alt. */
const INLINE_IMAGE = new RegExp(
  `!\\[([^\\][\\n]{0,${LINK_TEXT_MAX}})\\]\\([^)[\\n]{0,${LINK_TARGET_MAX}}\\)`,
  "g",
);
/** Inline link: `[text](href)` → text. */
const INLINE_LINK = new RegExp(
  `\\[([^\\][\\n]{0,${LINK_TEXT_MAX}})\\]\\([^)[\\n]{0,${LINK_TARGET_MAX}}\\)`,
  "g",
);
/** Reference link: `[text][ref]` → text. */
const REFERENCE_LINK = new RegExp(
  `\\[([^\\][\\n]{0,${LINK_TEXT_MAX}})\\]\\[[^\\][\\n]{0,${LINK_TEXT_MAX}}\\]`,
  "g",
);
/**
 * Autolink: `<https://…>` → the bare URL, so the URL pass sees it. The target
 * class excludes `<` for the same reason the link classes exclude `[`: an
 * unterminated `<http://` used to walk the full target bound before failing,
 * which made 1 MB of them cost ~380 ms instead of under 1 ms.
 */
const AUTOLINK = new RegExp(`<(https?://[^<>\\s]{1,${LINK_TARGET_MAX}})>`, "g");
/** Inline code span: the backticks go, the contents stay. */
const INLINE_CODE = new RegExp(
  "`{1,3}([^`\\n]{0," + CODE_SPAN_MAX + "})`{1,3}",
  "g",
);
/**
 * An HTML tag, opening or closing — but only a tag whose name is HTML. Model
 * output uses angle brackets for placeholders (`<Enter>`, `<order-id>`),
 * generics (`Map<string, T>`) and comparisons (`x<y and y>z`), and none of
 * those may be swallowed: the word inside is usually the instruction.
 */
const HTML_TAG_NAMES =
  "p|br|b|i|u|em|strong|a|span|div|code|pre|ul|ol|li|h[1-6]|img|table|thead|tbody|tr|td|th|blockquote|hr|sup|sub|small|mark|del|ins|s";
const HTML_TAG = new RegExp(
  `</?(?:${HTML_TAG_NAMES})(?=[\\s/>])[^<>\\n]{0,${TAG_BODY_MAX}}>`,
  "gi",
);
/** Strikethrough markers abutting text. */
const STRIKETHROUGH = /~~(?=\S)|(?<=\S)~~/g;

// Emphasis is a PAIR: an opening run preceded by the start of the text,
// whitespace, punctuation or a symbol and followed by a non-space, then a
// closing run preceded by a non-space and followed by the end, whitespace,
// punctuation or a symbol. A `*` between two digits (`2*3*4`, `*123*1#`)
// satisfies neither side and is left alone — the old "any run touching a
// non-space" rule spoke `2*3*4 = 24` as "234 = 24". The span between the
// runs excludes the delimiter, so an unpaired opener fails at the next
// delimiter instead of scanning to the bound.
//
// The boundary classes are Unicode: `\p{P}` and `\p{S}` rather than a list
// of ASCII brackets and sentence marks. An ASCII list left `**` in Hindi
// (`**भुगतान सफल रहा**।` — the closer sits before a danda), Chinese
// (`**总结**：` — a full-width colon), curly quotes (`“**Quoted**”`) and
// before an em dash (`**Fast**—and`); for a voice assistant those are the
// common cases, not the edge ones. The delimiter is itself punctuation, so
// it is excluded from its own boundary: without that, `x**2 + y**2` read the
// second `*` of each run as an opener/closer and became `x*2 + y*2`.
//
// Han, Hiragana, Katakana and Hangul also count as a boundary: those scripts
// have no spaces between words, so `**` glued straight to surrounding CJK
// text (`这是**重点**内容`, not `这是 **重点** 内容`) is the normal way it is
// written, not an edge case — without this, that `**` had neither side
// satisfy the boundary and was spoken aloud as asterisks.
const EMPHASIS_BOUNDARY =
  "\\s\\p{White_Space}\\p{P}\\p{S}\\p{Script=Han}\\p{Script=Hiragana}\\p{Script=Katakana}\\p{Script=Hangul}";
function emphasisPattern(delimiter: string): RegExp {
  const openBefore = `(?<![^${EMPHASIS_BOUNDARY}]|${delimiter})`;
  const closeAfter = `(?![^${EMPHASIS_BOUNDARY}]|${delimiter})`;
  const run = `${delimiter}{1,3}`;
  const span = `([^${delimiter}\\n]{1,${EMPHASIS_SPAN_MAX}}?)`;
  return new RegExp(
    `${openBefore}${run}(?=[^\\s${delimiter}])${span}(?<=\\S)${run}${closeAfter}`,
    "gu",
  );
}
const EMPHASIS_ASTERISK = emphasisPattern("\\*");
const EMPHASIS_UNDERSCORE = emphasisPattern("_");
/** `**bold *and italic* inside**`: each pass peels one level, so nesting needs more than one. */
const EMPHASIS_PASSES = 3;

// Backslash escapes must be resolved BEFORE the emphasis and link passes —
// `\*not bold\*` is literal asterisks, not emphasis — and the resolved
// character must then survive those passes. Each escapable character is
// swapped for a sentinel first and swapped back last. The sentinels are
// Unicode noncharacters (U+FDD0–U+FDEF), which are reserved for exactly this
// process-internal use and never occur in interchanged text; any that do
// arrive are dropped so they cannot masquerade as an escape.
const ESCAPABLE_PUNCTUATION = "\\`*_{}[]()#+-.!|>~<";
const ESCAPED_PUNCTUATION = /\\([\\`*_{}[\]()#+\-.!|>~<])/g;
const ESCAPE_SENTINEL_BASE = 0xfdd0;
const ESCAPE_SENTINELS = /[﷐-﷯]/g;

/** An absolute http(s) URL, as one unbroken token. */
const HTTP_URL = /https?:\/\/[^\s<>()[\]"']+/gi;
/** A bare `www.` host with optional path. */
const WWW_URL = /\bwww\.[^\s<>()[\]"']+/gi;
const TRAILING_PUNCTUATION = new Set([".", ",", ";", ":", "!", "?"]);

// One pictograph with the modifiers, variation selectors and keycap combiner
// that may trail it, then any number of further pictographs joined to it by
// U+200D. The whole sequence goes as one unit so a joined family or a
// skin-toned hand leaves nothing behind. The joiner is consumed ONLY here,
// between or beside pictographs: U+200D is also a letter-shaping control in
// Devanagari, Malayalam, Arabic and others, and stripping it everywhere
// changed the shape and pronunciation of ordinary Indic text.
const PICTOGRAPH =
  "(?:\\p{Extended_Pictographic}|\\p{Emoji_Presentation})(?:\\p{Emoji_Modifier}|\\uFE0E|\\uFE0F|\\u20E3)*";
const EMOJI = new RegExp(
  `\\u200D?${PICTOGRAPH}(?:\\u200D${PICTOGRAPH})*\\u200D?`,
  "gu",
);
/** Skin-tone modifiers, variation selectors and the keycap combiner left over after a bare digit or symbol. */
const EMOJI_JOINERS = /\p{Emoji_Modifier}|\uFE0E|\uFE0F|\u20E3/gu;
/** An `http`/`https` scheme, matched case-insensitively (RFC 3986 \u00A73.1). */
const HTTP_SCHEME = /^https?:\/\//i;

const LINE_BREAKS = /\r\n?/g;
/** Runs of two or more horizontal spaces; nothing is required after the run. */
const HORIZONTAL_RUNS = /[ \t]{2,}/g;
/** Applied only after HORIZONTAL_RUNS, when no run is longer than one character. */
const SPACE_BEFORE_NEWLINE = /[ \t]\n/g;
const SPACE_AFTER_NEWLINE = /\n[ \t]/g;
const BLANK_LINE_RUNS = /\n{3,}/g;

function resolveOptions(
  opts: SpeechSanitizeOptions | undefined,
): ResolvedSpeechSanitizeOptions {
  return {
    markdown: opts?.markdown ?? true,
    codeBlocks: opts?.codeBlocks ?? "phrase",
    codeBlockPhrase: opts?.codeBlockPhrase ?? DEFAULT_CODE_BLOCK_PHRASE,
    urls: opts?.urls ?? "hostname",
    emoji: opts?.emoji ?? true,
  };
}

/**
 * Resolve a `TTSOptions.sanitize` value into options, or `undefined` when the
 * pass is off. `true` means the defaults; an object tunes them.
 */
export function resolveSpeechSanitizeOptions(
  sanitize: boolean | SpeechSanitizeOptions | undefined,
): SpeechSanitizeOptions | undefined {
  if (sanitize === undefined || sanitize === false) {
    return undefined;
  }
  return sanitize === true ? {} : sanitize;
}

function isRuleLine(line: string): boolean {
  if (!RULE_LINE.test(line)) {
    return false;
  }
  let markers = 0;
  for (const ch of line) {
    if (ch === "=" || ch === "-" || ch === "*" || ch === "_") {
      markers += 1;
    }
  }
  return markers >= 3;
}

function isTableSeparator(line: string): boolean {
  return line.includes("---") && TABLE_SEPARATOR_CHARS.test(line);
}

function isTableRow(line: string): boolean {
  const trimmed = line.trim();
  return trimmed.startsWith("|") || trimmed.endsWith("|");
}

/** `| a | b |` → `a, b`. Split on the pipe and trim each cell — no regex over the padding. */
function flattenTableRow(line: string): string {
  const cells: string[] = [];
  for (const cell of line.split("|")) {
    const trimmed = cell.trim();
    if (trimmed.length > 0) {
      cells.push(trimmed);
    }
  }
  return cells.join(", ");
}

function stripBlockquote(line: string): string {
  let current = line;
  for (;;) {
    const next = current.replace(BLOCKQUOTE_MARKER, "");
    if (next === current) {
      return current;
    }
    current = next;
  }
}

/**
 * One pass over the lines: fenced code per `codeBlocks`, then the per-line
 * block markers (headings, rules, bullets, blockquotes, tables).
 */
function stripBlockMarkdown(
  text: string,
  options: ResolvedSpeechSanitizeOptions,
): string {
  const out: string[] = [];
  let inFence = false;

  for (const line of text.split("\n")) {
    if (FENCE_LINE.test(line)) {
      if (options.codeBlocks === "keep") {
        // Streaming: the block's extent is unknowable per segment, so only
        // the fence line itself is dropped and the contents are spoken.
        continue;
      }
      if (!inFence) {
        inFence = true;
        if (options.codeBlocks === "phrase") {
          out.push(options.codeBlockPhrase);
        }
      } else {
        inFence = false;
      }
      continue;
    }
    if (inFence) {
      continue;
    }

    if (isRuleLine(line) || isTableSeparator(line)) {
      continue;
    }

    let current = stripBlockquote(line);
    current = current.replace(HEADING_MARKER, "");
    current = current.replace(BULLET_MARKER, "$1");
    current = current.replace(ORDERED_MARKER, "$1");
    current = current.replace(TASK_CHECKBOX, "");
    if (isTableRow(current)) {
      current = flattenTableRow(current);
    }
    out.push(current);
  }

  return out.join("\n");
}

/** `\*` → sentinel, so the character it protects is invisible to the passes that follow. */
function protectEscapes(text: string): string {
  return text
    .replace(ESCAPE_SENTINELS, "")
    .replace(ESCAPED_PUNCTUATION, (_match, ch: string) =>
      String.fromCharCode(
        ESCAPE_SENTINEL_BASE + ESCAPABLE_PUNCTUATION.indexOf(ch),
      ),
    );
}

/** Sentinel → the literal character `\*` stood for. */
function restoreEscapes(text: string): string {
  return text.replace(
    ESCAPE_SENTINELS,
    (sentinel) =>
      ESCAPABLE_PUNCTUATION[sentinel.charCodeAt(0) - ESCAPE_SENTINEL_BASE] ??
      "",
  );
}

function stripEmphasis(text: string): string {
  let current = text;
  for (let pass = 0; pass < EMPHASIS_PASSES; pass++) {
    const next = current
      .replace(EMPHASIS_ASTERISK, "$1")
      .replace(EMPHASIS_UNDERSCORE, "$1");
    if (next === current) {
      break;
    }
    current = next;
  }
  return current;
}

function stripInlineMarkdown(text: string): string {
  const stripped = protectEscapes(text)
    .replace(INLINE_IMAGE, "$1")
    .replace(INLINE_LINK, "$1")
    .replace(REFERENCE_LINK, "$1")
    .replace(AUTOLINK, "$1")
    .replace(INLINE_CODE, "$1")
    .replace(HTML_TAG, " ")
    .replace(STRIKETHROUGH, "");
  return restoreEscapes(stripEmphasis(stripped));
}

/** Split a URL token into the URL proper and the sentence punctuation glued to its end. */
function splitTrailingPunctuation(token: string): {
  url: string;
  trailing: string;
} {
  let end = token.length;
  while (end > 0 && TRAILING_PUNCTUATION.has(token[end - 1] ?? "")) {
    end -= 1;
  }
  return { url: token.slice(0, end), trailing: token.slice(end) };
}

/**
 * The host a URL should be spoken as. `URL.hostname` is the punycode form
 * (`xn--mnchen-3ya.example`), which a voice spells letter by letter; Node's
 * `domainToUnicode` gives back `münchen.example`. The scheme test is
 * case-insensitive because `HTTP_URL` is: `HTTPS://Example.COM/x` used to
 * fail a case-sensitive `startsWith("http")`, get a second scheme prepended,
 * and be spoken as "https".
 */
function hostnameOf(url: string): string {
  const withScheme = HTTP_SCHEME.test(url) ? url : `https://${url}`;
  try {
    const host = new URL(withScheme).hostname;
    return typeof nodeUrl.domainToUnicode === "function"
      ? nodeUrl.domainToUnicode(host)
      : host;
  } catch {
    return "";
  }
}

function rewriteUrls(
  text: string,
  mode: ResolvedSpeechSanitizeOptions["urls"],
): string {
  const replacer = (match: string): string => {
    const { url, trailing } = splitTrailingPunctuation(match);
    if (mode === "remove") {
      return trailing;
    }
    const host = hostnameOf(url);
    return host ? `${host}${trailing}` : trailing;
  };
  return text.replace(HTTP_URL, replacer).replace(WWW_URL, replacer);
}

function removeEmoji(text: string): string {
  return text.replace(EMOJI, "").replace(EMOJI_JOINERS, "");
}

function collapseWhitespace(text: string): string {
  return text
    .replace(HORIZONTAL_RUNS, " ")
    .replace(SPACE_BEFORE_NEWLINE, "\n")
    .replace(SPACE_AFTER_NEWLINE, "\n")
    .replace(BLANK_LINE_RUNS, "\n\n")
    .trim();
}

/**
 * Rewrite `text` into what a TTS voice should say.
 *
 * Pure and deterministic: the same input and options always yield the same
 * output, and nothing here reads the environment. Runs in time linear in the
 * length of `text`.
 *
 * @example
 * ```typescript
 * prepareTextForSpeech("## Title\n\nSee **this** at https://docs.example.com/x 🎉");
 * // → "Title\n\nSee this at docs.example.com"
 * ```
 */
export function prepareTextForSpeech(
  text: string,
  opts?: SpeechSanitizeOptions,
): string {
  const options = resolveOptions(opts);
  let out = text.replace(LINE_BREAKS, "\n");
  if (options.markdown) {
    out = stripBlockMarkdown(out, options);
    out = stripInlineMarkdown(out);
  }
  out = rewriteUrls(out, options.urls);
  if (options.emoji) {
    out = removeEmoji(out);
  }
  return collapseWhitespace(out);
}
