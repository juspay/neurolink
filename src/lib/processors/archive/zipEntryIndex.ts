/**
 * First-wins lookup over a ZIP's central directory.
 *
 * A ZIP may carry two entries with the same name. adm-zip's `getEntry(name)`
 * resolves the LAST one, while `getEntries()` lists them in directory order,
 * so a processor that lists with one call and reads with the other can show
 * the user a listing of one file and the contents of another. Every reader
 * here indexes the iterated entries once and reads from that index, so the
 * entry it describes is the entry it opens; a repeated name is reported to
 * the caller rather than silently resolved either way.
 *
 * @module processors/archive/zipEntryIndex
 */

import type { NamedZipEntry } from "../../types/index.js";

/**
 * Index `entries` by name, keeping the FIRST occurrence of each. Returns the
 * index and the names that occurred more than once, in first-seen order.
 */
export function indexZipEntriesByName<T extends NamedZipEntry>(
  entries: readonly T[],
): { byName: Map<string, T>; duplicates: string[] } {
  const byName = new Map<string, T>();
  const duplicates: string[] = [];
  const flagged = new Set<string>();
  for (const entry of entries) {
    if (byName.has(entry.entryName)) {
      if (!flagged.has(entry.entryName)) {
        flagged.add(entry.entryName);
        duplicates.push(entry.entryName);
      }
      continue;
    }
    byName.set(entry.entryName, entry);
  }
  return { byName, duplicates };
}
