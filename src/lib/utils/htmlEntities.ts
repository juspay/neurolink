/**
 * Decode a caller's supported HTML text references exactly once.
 *
 * Replacement scans the original string: a decoded ampersand is never
 * reinterpreted as the beginning of another reference. Unknown references
 * stay literal. This is text conversion, not HTML output sanitization.
 */
export function decodeHtmlTextEntitiesOnce(
  value: string,
  entities: Readonly<Record<string, string>>,
  decodeDecimalReferences = false,
): string {
  return value.replace(/&([a-z]+|#\d+);/gi, (match, body: string) => {
    const reference = body.toLowerCase();
    const decoded = Object.hasOwn(entities, reference)
      ? entities[reference]
      : undefined;
    if (typeof decoded === "string") {
      return decoded;
    }
    if (!decodeDecimalReferences || !reference.startsWith("#")) {
      return match;
    }

    const codePoint = Number(reference.slice(1));
    if (
      !Number.isInteger(codePoint) ||
      codePoint <= 0 ||
      codePoint > 0x10ffff ||
      (codePoint >= 0xd800 && codePoint <= 0xdfff)
    ) {
      return match;
    }
    return String.fromCodePoint(codePoint);
  });
}
