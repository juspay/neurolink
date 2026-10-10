/**
 * Single-pass markup removal for turning HTML into indexable text.
 *
 * This is text conversion, not output sanitization. The result is plain text
 * for retrieval and chunking; it is not meant to be written back into a page,
 * and the caller's entity decoding can legitimately turn `&lt;b&gt;` into
 * `<b>`.
 *
 * Why one pass: the previous implementation chained several global regex
 * replacements (script, style, comment, block end, generic tag). Each removal
 * could join the text on either side of it into a new tag for the next
 * replacement (`<scr<!---->ipt>`), and the lazy `[\s\S]*?` bodies rescanned
 * the rest of the input once per unclosed `<script`, which is quadratic.
 * Here the input is read left to right exactly once. Every character of the
 * output is copied from an unremoved stretch of the input, a removed stretch
 * is never re-read, and every search either consumes what it scans or is
 * answered in constant time from an index computed up front, so the work is
 * linear in the input length.
 *
 * Invariant: the output never matches `<[^>]+>`. A `<` survives only when no
 * `>` follows it in the input, or when the next character is the `>` itself
 * (`<>`, which is not a tag). A removed span therefore cannot leave behind,
 * or assemble, a tag.
 */

const SLASH = 0x2f;
const GREATER_THAN = 0x3e;
const WHITESPACE = /\s/;

function isAsciiAlphanumeric(code: number): boolean {
  return (
    (code >= 0x30 && code <= 0x39) ||
    (code >= 0x41 && code <= 0x5a) ||
    (code >= 0x61 && code <= 0x7a)
  );
}

// The characters after which an HTML tokenizer ends a tag name.
function endsTagName(code: number): boolean {
  return (
    code === 0x09 ||
    code === 0x0a ||
    code === 0x0c ||
    code === 0x0d ||
    code === 0x20 ||
    code === SLASH ||
    code === GREATER_THAN
  );
}

function scanTagName(html: string, from: number): number {
  let end = from;
  while (end < html.length && isAsciiAlphanumeric(html.charCodeAt(end))) {
    end++;
  }
  return end;
}

/**
 * Index of the next `</name` that is followed by whitespace, `/` or `>`
 * (so `</script >` and `</SCRIPT foo>` count), or -1. Case-insensitive.
 */
function findEndTag(html: string, name: string, from: number): number {
  let at = html.indexOf("</", from);
  while (at !== -1) {
    const nameEnd = at + 2 + name.length;
    if (
      html.slice(at + 2, nameEnd).toLowerCase() === name &&
      endsTagName(html.charCodeAt(nameEnd))
    ) {
      return at;
    }
    at = html.indexOf("</", at + 2);
  }
  return -1;
}

/**
 * Remove HTML markup from `html` in one linear pass.
 *
 * - `<script>` / `<style>` elements are removed with their bodies. The end
 *   tag may carry whitespace or attributes (`</script >`). An element with
 *   no usable end tag loses only its start tag, as before.
 * - `<!-- ... -->` is replaced with `commentReplacement`. An unterminated
 *   comment is treated like any other tag and ends at the next `>`.
 * - A closing tag named in `lineBreakEndTags` and a void tag named in
 *   `lineBreakVoidTags` (`<br>`, `<hr />`) become a newline.
 * - Any other `<...>` becomes `tagReplacement`. A `<` with no `>` after it,
 *   and the empty `<>`, are literal text and are kept.
 *
 * Tag-name lists are lower case.
 */
export function removeHtmlMarkup(
  html: string,
  options: {
    readonly tagReplacement: string;
    readonly commentReplacement: string;
    readonly lineBreakEndTags: readonly string[];
    readonly lineBreakVoidTags: readonly string[];
  },
): string {
  const { tagReplacement, commentReplacement } = options;
  const lineBreakEndTags = new Set(options.lineBreakEndTags);
  const lineBreakVoidTags = new Set(options.lineBreakVoidTags);

  // Answers "is there any `>` / `-->` after here" without a scan. Once an
  // element finds no usable end tag, no later element of that name can.
  const lastGreaterThan = html.lastIndexOf(">");
  const lastCommentEnd = html.lastIndexOf("-->");
  const withoutEndTag = new Set<string>();

  const markupAt = (
    at: number,
  ): { end: number; replacement: string } | null => {
    if (html.startsWith("<!--", at) && lastCommentEnd >= at + 4) {
      return {
        end: html.indexOf("-->", at + 4) + 3,
        replacement: commentReplacement,
      };
    }

    const closing = html.charCodeAt(at + 1) === SLASH;
    const nameStart = closing ? at + 2 : at + 1;
    const nameEnd = scanTagName(html, nameStart);
    const name = html.slice(nameStart, nameEnd).toLowerCase();

    if (
      !closing &&
      (name === "script" || name === "style") &&
      endsTagName(html.charCodeAt(nameEnd)) &&
      !withoutEndTag.has(name)
    ) {
      const startTagEnd = html.indexOf(">", nameEnd);
      const endTag = findEndTag(html, name, startTagEnd + 1);
      if (endTag !== -1 && endTag < lastGreaterThan) {
        return { end: html.indexOf(">", endTag) + 1, replacement: "" };
      }
      withoutEndTag.add(name);
    }

    if (
      closing &&
      html.charCodeAt(nameEnd) === GREATER_THAN &&
      lineBreakEndTags.has(name)
    ) {
      return { end: nameEnd + 1, replacement: "\n" };
    }

    if (!closing && lineBreakVoidTags.has(name)) {
      let probe = nameEnd;
      while (WHITESPACE.test(html.charAt(probe))) {
        probe++;
      }
      if (html.charCodeAt(probe) === SLASH) {
        probe++;
      }
      if (html.charCodeAt(probe) === GREATER_THAN) {
        return { end: probe + 1, replacement: "\n" };
      }
    }

    const end = html.indexOf(">", at + 1);
    return end === at + 1
      ? null
      : { end: end + 1, replacement: tagReplacement };
  };

  let output = "";
  let copied = 0;
  let open = html.indexOf("<");
  while (open !== -1 && open < lastGreaterThan) {
    const markup = markupAt(open);
    if (markup === null) {
      open = html.indexOf("<", open + 1);
      continue;
    }
    output += html.slice(copied, open) + markup.replacement;
    copied = markup.end;
    open = html.indexOf("<", copied);
  }
  return output + html.slice(copied);
}
