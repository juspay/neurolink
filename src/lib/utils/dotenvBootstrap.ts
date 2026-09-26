/**
 * Implicit `.env` bootstrap, shared by the SDK entry point and the CLI.
 *
 * Both sites used to call dotenv's `config()` with no options beyond
 * `quiet`, and a direct `config()` call does NOT read `DOTENV_CONFIG_PATH`
 * — only dotenv's own `dotenv/config` preload entry does. So the strip this
 * repo documents and uses to vet suites,
 *
 *     env -i HOME=… PATH=… CI=true DOTENV_CONFIG_PATH=/dev/null …
 *
 * stripped nothing the moment a suite imported the built SDK: importing
 * `dist/index.js` loads `src/lib/neurolink.ts`, which loaded `.env` from the
 * working directory regardless. A credential the strip was supposed to
 * remove was present at every read site, and a suite that only passes
 * because of it looks identical to one that does not need it. See #1744;
 * the CI-only failure in #1735 is what surfaced it.
 *
 * Honouring the variable here makes that strip real. It is additive: with
 * `DOTENV_CONFIG_PATH` unset — which is every existing caller, SDK consumers
 * included — this does exactly what it did before, loading `.env` from the
 * current working directory. Only a caller that explicitly sets the variable
 * sees a difference, and what it then sees is dotenv's own documented
 * meaning for it.
 */
export async function loadProcessDotenv(): Promise<void> {
  try {
    // Suppress dotenv v17's stdout banner — it pollutes CLI JSON output.
    // Redundant next to the explicit `quiet` below, which is what actually
    // silences a direct `config()` call; kept because both call sites set it
    // and something downstream may still read it.
    process.env.DOTENV_CONFIG_QUIET = process.env.DOTENV_CONFIG_QUIET ?? "true";
    const { config } = await import("dotenv");
    const path = process.env.DOTENV_CONFIG_PATH;
    // Pass `path` only when set: `{ path: undefined }` is not the same as
    // omitting it for every dotenv version, and the default must stay
    // byte-for-byte what it was.
    config(path ? { quiet: true, path } : { quiet: true });
  } catch {
    // dotenv ships as a normal runtime dependency (see package.json), so this
    // branch should not be reachable in a standard install. It stays as a
    // defensive fallback for an install that has pruned or bundled
    // dependencies unusually, so a missing module degrades to "no .env
    // loaded" instead of crashing the SDK/CLI entry point.
  }
}
