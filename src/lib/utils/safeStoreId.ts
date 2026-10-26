/**
 * Shape check for an id that becomes a file name or a key segment.
 *
 * The same rule `isSafeArtifactId` applies to model-supplied artifact ids,
 * widened by `.` for host-registered skill ids: one leading alphanumeric, then
 * up to 127 of `[A-Za-z0-9._-]`. Nothing that could be a path separator, a
 * traversal segment (a leading `.` is refused, so `..` cannot start one), a
 * glob metacharacter or a line break gets through.
 *
 * @module utils/safeStoreId
 */

const SAFE_STORE_ID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;

/** Whether `id` may be joined into a path or a key. */
export function isSafeStoreId(id: string): boolean {
  return SAFE_STORE_ID.test(id);
}

/**
 * Refuse an unsafe id.
 *
 * @throws {Error} with `code: "INVALID_STORE_ID"`
 */
export function assertSafeStoreId(id: string, label: string): void {
  if (isSafeStoreId(id)) {
    return;
  }
  const error = new Error(
    `${label} "${String(id).slice(0, 64)}" is not a valid id: use 1-128 characters of letters, digits, '.', '_' or '-', starting with a letter or digit`,
  );
  (error as NodeJS.ErrnoException).code = "INVALID_STORE_ID";
  throw error;
}
