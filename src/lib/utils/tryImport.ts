/**
 * Dynamically import an optional dependency, converting a missing package into
 * an actionable error.
 *
 * NeuroLink declares 42 `optionalDependencies`, and each loader had grown its
 * own copy of the same try/catch: check `err.code`, substring-match the package
 * name, rethrow a friendlier Error. The copies had drifted — some said
 * `pnpm add`, one said `npm install`, and the phrasing varied per call site.
 *
 * Only missing-module failures are intercepted. A package that is installed but
 * throws while evaluating (syntax error, ESM/CJS interop, a broken transitive
 * dep) rethrows unchanged — turning those into "please install X" would send
 * the caller after a package they already have. The same applies to specifiers
 * that are not installable packages at all (relative paths, file/data URLs):
 * they rethrow untouched rather than producing an unrunnable install command.
 *
 * @param pkg - Module specifier. The install hint is only produced for bare
 *   package names; anything else rethrows the loader's own error.
 * @param feature - Human-readable capability name, used to open the message.
 * @returns The imported module namespace, typed as `T` (`unknown` if the
 *   caller does not supply a type argument, since the shape cannot be known
 *   for a dynamic specifier).
 * @throws The loader's original error, or an `Error` naming the package and
 *   the `pnpm add` command when a bare package is genuinely absent. The
 *   original failure is always preserved on `cause`.
 *
 * @example
 * ```ts
 * const ExcelJS = await tryImport<typeof import("exceljs")>(
 *   "exceljs",
 *   "Excel file processing",
 * );
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

/**
 * True only when `err` is the module loader failing to resolve `pkg` itself.
 *
 * The package name is matched inside quotes because that is how both loaders
 * format it — ESM `Cannot find package 'x' imported from …`, CJS
 * `Cannot find module 'x'`. Matching the bare substring instead (as the
 * hand-rolled copies did) also matches a *transitive* dependency whose path
 * happens to contain the name, which would blame the wrong package.
 *
 * The specifier must also be a bare package name. Without that check a missing
 * relative path or file URL is rewritten into `pnpm add ./fixtures/thing.mjs`,
 * which is not a command anyone can run — and this helper is already called
 * with `file:` and `data:` URLs, so that path is reachable rather than
 * theoretical.
 */
function isMissingModule(err: unknown, pkg: string): boolean {
  if (!(err instanceof Error)) {
    return false;
  }
  if (!isBarePackageSpecifier(pkg)) {
    return false;
  }
  const code = (err as NodeJS.ErrnoException).code;
  if (code !== "ERR_MODULE_NOT_FOUND" && code !== "MODULE_NOT_FOUND") {
    return false;
  }
  return err.message.includes(`'${pkg}'`) || err.message.includes(`"${pkg}"`);
}

/**
 * True for specifiers that name an installable package — `exceljs`,
 * `@scope/pkg`, `pkg/sub/path`.
 *
 * False for the two things an install hint cannot help with: filesystem paths
 * (`./x`, `../x`, `/x`, and Windows `C:\x`, which the scheme test below also
 * rejects) and any URL (`file:`, `data:`, `http:`), including the `node:`
 * builtins, which are never installed.
 */
function isBarePackageSpecifier(specifier: string): boolean {
  if (specifier.length === 0) {
    return false;
  }
  if (
    specifier.startsWith("/") ||
    specifier.startsWith("./") ||
    specifier.startsWith("../")
  ) {
    return false;
  }
  // RFC 3986 scheme: ALPHA *( ALPHA / DIGIT / "+" / "-" / "." ) ":"
  return !/^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(specifier);
}
