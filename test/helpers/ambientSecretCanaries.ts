/**
 * Side-effect module that plants dummy values under the names real secrets and
 * endpoint overrides arrive in, so a suite can prove `credentialFreeEnv.ts`
 * removed them. Import it BEFORE `./credentialFreeEnv.js`.
 *
 * `credentialEnvNamesPresent()` cannot prove this on its own: it reuses the
 * strip's own pattern, so a name the pattern misses is missed by the strip and
 * by the check alike. These names are listed literally, not matched, which is
 * what makes the check independent of the pattern.
 */
export const AMBIENT_ENV_CANARIES: readonly string[] = [
  "GOOGLE_SERVICE_ACCOUNT_KEY",
  "GOOGLE_AUTH_PRIVATE_KEY",
  "AZURE_SPEECH_KEY",
  "OTEL_EXPORTER_OTLP_HEADERS",
  "REDIS_URL",
  "DOCKER_AUTH_CONFIG",
  "SSH_AUTH_SOCK",
  "OTEL_EXPORTER_OTLP_ENDPOINT",
  "GOOGLE_VERTEX_BASE_URL",
  "AZURE_SPEECH_ENDPOINT",
  "AWS_PROFILE",
];

for (const name of AMBIENT_ENV_CANARIES) {
  process.env[name] = "canary.invalid";
}

/** Canary names still in the environment: non-empty means the strip missed one. */
export function survivingAmbientEnvCanaries(): string[] {
  return AMBIENT_ENV_CANARIES.filter((name) => process.env[name] !== undefined);
}
