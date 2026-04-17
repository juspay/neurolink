/**
 * Dynamically import an optional dependency with a helpful error message.
 *
 * Use this for packages in `optionalDependencies` — when the import fails
 * because the package isn't installed, the caller gets a clear install hint
 * instead of a cryptic ERR_MODULE_NOT_FOUND.
 *
 * Only intercepts missing-module errors; real failures (syntax errors,
 * ESM/CJS interop issues, transitive dep problems) are rethrown unchanged.
 *
 * @example
 * ```ts
 * const ExcelJS = await tryImport<typeof import("exceljs")>("exceljs", "Excel file processing");
 * ```
 */
export async function tryImport<T = unknown>(
  pkg: string,
  feature: string,
): Promise<T> {
  try {
    return (await import(/* @vite-ignore */ pkg)) as T;
  } catch (err) {
    if (isMissingModule(err, pkg)) {
      throw new Error(
        `${feature} requires the "${pkg}" package. Install it with:\n  pnpm add ${pkg}`,
        { cause: err },
      );
    }
    throw err;
  }
}

function isMissingModule(err: unknown, pkg: string): boolean {
  if (!(err instanceof Error)) {
    return false;
  }
  const code = (err as NodeJS.ErrnoException).code;
  if (code !== "ERR_MODULE_NOT_FOUND" && code !== "MODULE_NOT_FOUND") {
    return false;
  }
  return err.message.includes(`'${pkg}'`) || err.message.includes(`"${pkg}"`);
}
