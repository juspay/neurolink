/**
 * Content sniffing for text-shaped image formats.
 *
 * SVG is markup, so it has no byte signature — but it does have an unambiguous
 * root element, and identifying it matters twice over: the detector routes SVG
 * to the sanitizer rather than to a vision API, and the image path must not let
 * SVG bytes travel under some other format's MIME type.
 *
 * ## Why this is a scan and not a regular expression
 *
 * The obvious implementation strips the prolog with a pattern like
 * `(?:<!--[\s\S]*?-->\s*)*<svg`. That is two nested quantifiers, and CodeQL
 * rightly flags it as `js/redos`: input beginning `<!--` and repeating
 * `--><!--` drives exponential backtracking, so a hostile (or merely odd)
 * upload can burn CPU inside what is supposed to be a cheap type check.
 *
 * The `.replace()`-chain alternative is unsound for a different reason —
 * removing a multi-character construct can join the surrounding text into a
 * fresh instance of that same construct, so one pass does not converge
 * (`<!--<!-- -->-->` leaves a comment behind). CodeQL flags that shape too, as
 * `js/incomplete-multi-character-sanitization`.
 *
 * A single forward scan has neither problem: the cursor only ever advances, so
 * the work is linear in the input and no construct can re-form behind it.
 *
 * @module utils/markupSniff
 */

/** Bytes inspected when sniffing for a markup root element. */
const MARKUP_SNIFF_LIMIT = 1024;

/**
 * Whether the leading bytes are an SVG document.
 *
 * Requires `<svg` to be the *root element* rather than merely present, so an
 * HTML page embedding an inline `<svg>` icon is not mistaken for a standalone
 * image. A BOM, XML declaration, DOCTYPE and comments may precede it.
 *
 * @param input - Buffer or string to inspect; only the head is read.
 */
export function looksLikeSvgMarkup(input: Buffer | string): boolean {
  const head =
    typeof input === "string"
      ? input.slice(0, MARKUP_SNIFF_LIMIT)
      : input.toString("utf8", 0, Math.min(input.length, MARKUP_SNIFF_LIMIT));

  if (!head.includes("<svg")) {
    return false;
  }

  let cursor = head.charCodeAt(0) === 0xfeff ? 1 : 0;
  while (cursor < head.length) {
    while (cursor < head.length && /\s/.test(head[cursor])) {
      cursor++;
    }
    if (head[cursor] !== "<") {
      // Text before any element — not a well-formed XML document.
      return false;
    }
    // Each prolog construct ends at a known delimiter; an unterminated one
    // means the document is truncated or malformed, so stop rather than guess.
    let end: number;
    if (head.startsWith("<?", cursor)) {
      end = head.indexOf("?>", cursor + 2);
      cursor = end === -1 ? head.length : end + 2;
    } else if (head.startsWith("<!--", cursor)) {
      end = head.indexOf("-->", cursor + 4);
      cursor = end === -1 ? head.length : end + 3;
    } else if (head.startsWith("<!", cursor)) {
      // DOCTYPE. Stopping at the first '>' is wrong for two legal forms: a
      // quoted public/system identifier may contain '>', and an internal
      // subset (`<!DOCTYPE svg [ <!ENTITY x "y"> ]>`) certainly does. Either
      // one left the cursor mid-declaration and made a valid SVG classify as
      // not-SVG. Track quotes and subset depth to find the real terminator.
      cursor = skipDoctype(head, cursor);
    } else {
      // First real element decides.
      return /^<svg[\s>/]/i.test(head.slice(cursor));
    }
  }
  return false;
}

/**
 * Return the index just past a DOCTYPE declaration beginning at `start`.
 *
 * Handles quoted identifiers and a bracketed internal subset. Returns
 * `head.length` when the declaration is unterminated within the sniffed
 * window, which stops the caller rather than letting it guess.
 */
function skipDoctype(head: string, start: number): number {
  let quote: string | null = null;
  let subsetDepth = 0;
  for (let i = start + 2; i < head.length; i++) {
    const ch = head[i];
    if (quote) {
      if (ch === quote) {
        quote = null;
      }
      continue;
    }
    // A comment inside the internal subset may itself contain ']' and '>'.
    // Treating those as structural closed the subset early and terminated the
    // DOCTYPE on the comment's own '-->', so valid SVG classified as not-SVG.
    if (head.startsWith("<!--", i)) {
      const commentEnd = head.indexOf("-->", i + 4);
      if (commentEnd === -1) {
        return head.length;
      }
      i = commentEnd + 2; // loop increment steps past the final '>'
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
    } else if (ch === "[") {
      subsetDepth++;
    } else if (ch === "]") {
      subsetDepth = Math.max(0, subsetDepth - 1);
    } else if (ch === ">" && subsetDepth === 0) {
      return i + 1;
    }
  }
  return head.length;
}
