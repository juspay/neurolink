/**
 * Side-effect module for suites that must never hold a real credential.
 * Import it FIRST — before `../dist/index.js` and before `./harness.js`.
 *
 * Both of those load `.env` at import time (`dist/index.js` through
 * `loadProcessDotenv()`, `harness.ts` through `dotenv/config`), and a
 * developer's `.env` carries dozens of live provider keys. A suite that only
 * overrides the current row's own variables leaves every other provider's
 * real key in `process.env`, and anything it spawns inherits them. Pointing
 * `DOTENV_CONFIG_PATH` at `/dev/null` (the strip `dotenvBootstrap.ts`
 * documents) makes every later `.env` load a no-op, and deleting the
 * credential-named variables the shell already exported removes the rest.
 *
 * Credentials also live in files under the home directory, and some beat an
 * API key: the Anthropic provider prefers the OAuth token in
 * `~/.neurolink/anthropic-credentials.json` over `ANTHROPIC_API_KEY` and
 * refreshes it against the live token endpoint. `HOME` therefore points at an
 * empty temp directory for the rest of the process, so `os.homedir()` finds
 * no stored credential of any kind.
 */
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const CREDENTIAL_ENV_NAME =
  /API_?KEY|TOKEN|SECRET|PASSWORD|CREDENTIAL|ACCESS_KEY/i;

export function isCredentialEnvName(name: string): boolean {
  return CREDENTIAL_ENV_NAME.test(name);
}

process.env.DOTENV_CONFIG_PATH = "/dev/null";

export const STRIPPED_CREDENTIAL_ENV_NAMES: readonly string[] = Object.keys(
  process.env,
).filter(isCredentialEnvName);

for (const name of STRIPPED_CREDENTIAL_ENV_NAMES) {
  delete process.env[name];
}

export const ISOLATED_HOME = mkdtempSync(
  join(tmpdir(), "neurolink-credential-free-home-"),
);
process.env.HOME = ISOLATED_HOME;
process.env.USERPROFILE = ISOLATED_HOME;

/**
 * Credential-named variables present right now. Call it after every import
 * has run: a non-empty result means something re-loaded a real `.env` after
 * the strip, and the suite is no longer credential-free.
 */
export function credentialEnvNamesPresent(): string[] {
  return Object.keys(process.env).filter(isCredentialEnvName);
}
