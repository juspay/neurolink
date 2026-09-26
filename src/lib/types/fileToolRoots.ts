/**
 * Filesystem roots for the built-in file tools — types.
 *
 * Naming: `pathSandbox.ts` owns `PathSandbox*` and `file.ts` owns `FilePath*`,
 * so this carries the `FileToolRoot` prefix (Critical Rule 9).
 */

/**
 * The directories the built-in file tools (readFile, listDirectory,
 * writeFile, analyzeCSV) and bash's `cwd` argument may touch for one request.
 *
 * `roots` are real, existing directories resolved once when the request
 * starts. `null` means the historical default: the process working
 * directory, read at call time. An empty array denies all file access.
 */
export type FileToolRootPolicy = {
  readonly roots: readonly string[] | null;
};
