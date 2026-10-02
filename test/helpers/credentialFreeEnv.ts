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
 * Secrets whose names the plain API-key and token words miss (a service-account
 * or private key, a speech key, OTLP exporter headers, a Redis URL with a
 * password, an auth config blob, the ssh-agent socket) are matched too, and so
 * are ambient endpoint overrides (`*_BASE_URL`, `*_ENDPOINT`, the OTLP exporter
 * settings, `AWS_PROFILE`), which would otherwise send a cell's traffic or
 * telemetry somewhere other than the stand-in. A row re-adds the URLs it needs
 * through its own `envFor`.
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
  /API_?KEY|TOKEN|SECRET|PASSWORD|CREDENTIAL|ACCESS_KEY|PRIVATE_KEY|SERVICE_ACCOUNT|SPEECH_KEY|_KEY$|OTLP_\w*HEADERS|AUTH_CONFIG|^SSH_AUTH_SOCK$|^REDIS_URL$/i;

const AMBIENT_ENDPOINT_ENV_NAME =
  /^OTEL_EXPORTER_OTLP_|_BASE_URL$|_ENDPOINT$|^AWS_PROFILE$/i;

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

for (const name of Object.keys(process.env)) {
  if (AMBIENT_ENDPOINT_ENV_NAME.test(name)) {
    delete process.env[name];
  }
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
