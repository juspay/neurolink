/**
 * Text-layer detection for pdf-parse results.
 *
 * @module utils/pdfText
 */

import type { TextResult } from "pdf-parse";

/**
 * The trimmed text of a pdf-parse `getText()` result, or `""` when no page has
 * a text layer — the shape of a scanned, image-only document.
 *
 * pdf-parse appends a `-- n of N --` marker after every page, so `result.text`
 * is never empty, not even for a scan: checking it alone reads a scanned PDF as
 * text and hands the page markers on as its content. Emptiness is decided from
 * the per-page text instead, which holds no markers. A result without `pages`
 * falls back to the joined text.
 *
 * The same rule `utils/messageBuilder.ts` applies to inline PDF attachments.
 */
export function pdfTextLayer(
  result: Pick<TextResult, "text" | "pages"> | null | undefined,
): string {
  const pageTexts = result?.pages?.map((page) => page.text) ?? [
    result?.text ?? "",
  ];
  const hasTextLayer = pageTexts.some((text) => text.trim().length > 0);
  return hasTextLayer ? (result?.text ?? "").trim() : "";
}
