/**
 * Shared, RFC-4180-aware delimiter-separated-value helpers.
 *
 * Consolidates quote-aware field counting/splitting that was previously
 * duplicated across csvProcessor.ts and fileDetector.ts (#359), and adds
 * delimiter detection so TSV / semicolon / pipe files parse correctly (#361).
 * Keeping these in one module prevents the same quoting edge case from having
 * to be fixed in three places and drifting out of sync.
 */

/** Delimiter candidates, in tie-break preference order (comma first). */
export const CANDIDATE_DELIMITERS = [",", "\t", ";", "|"] as const;

/**
 * Split a single line into fields, respecting RFC-4180 quoting: a delimiter
 * inside a `"…"` quoted field does not split, and `""` is an escaped quote.
 */
export function splitCSVFields(line: string, delimiter = ","): string[] {
  const fields: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        field += '"';
        i++; // consume the escaped quote
        continue;
      }
      inQuotes = !inQuotes;
    } else if (ch === delimiter && !inQuotes) {
      fields.push(field);
      field = "";
    } else {
      field += ch;
    }
  }
  fields.push(field);
  return fields;
}

/** Count fields in a single line, respecting RFC-4180 quoting. */
export function countCSVColumns(line: string, delimiter = ","): number {
  return splitCSVFields(line, delimiter).length;
}

/**
 * Detect the delimiter of DSV content by testing comma/tab/semicolon/pipe
 * against up to 5 sampled non-empty lines and keeping the candidate with the
 * most consistent (>1) column count. Comma wins ties and the "nothing splits"
 * case, so plain CSVs are never reclassified. An optional extension hint
 * (`tsv` → tab, `psv` → pipe) breaks ambiguity in the file's favor.
 */
export function detectDelimiter(
  lines: string[],
  extensionHint?: string,
): string {
  const sample = lines.filter((l) => l.trim() !== "").slice(0, 5);
  if (sample.length === 0) {
    return ",";
  }

  const hint = extensionHint?.toLowerCase().replace(/^\./, "");
  const hinted = hint === "tsv" ? "\t" : hint === "psv" ? "|" : undefined;

  let best = ",";
  let bestScore = -1;

  for (const delim of CANDIDATE_DELIMITERS) {
    const counts = sample.map((l) => countCSVColumns(l, delim));
    const headerCols = counts[0];
    if (headerCols <= 1) {
      continue; // this delimiter doesn't split the header — not the delimiter
    }
    const consistent = counts.every((c) => c === headerCols);
    // Prefer: a matching extension hint, then consistency, then more columns,
    // with a small comma bias so comma stays the default on ties.
    const score =
      (delim === hinted ? 1000 : 0) +
      (consistent ? 100 : 0) +
      headerCols +
      (delim === "," ? 0.5 : 0);
    if (score > bestScore) {
      bestScore = score;
      best = delim;
    }
  }

  // Nothing split multi-column, but the extension says otherwise — honor it.
  if (bestScore < 0 && hinted) {
    return hinted;
  }
  return best;
}
