/**
 * Returns a SKIP message string when any of the listed env vars are missing.
 * Returns null when all are present.
 */
export function skipIfEnvMissing(...vars: string[]): string | null {
  const missing = vars.filter((v) => !process.env[v]);
  return missing.length > 0 ? `SKIP: missing env ${missing.join(", ")}` : null;
}

/**
 * Detect provider/credential errors that mean "could not run the test"
 * rather than "the test reproduced the bug". Mirrors the convention used
 * by continuous-test-suite-credentials.ts.
 */
export function isExpectedProviderError(msg: string): boolean {
  const lower = msg.toLowerCase();
  return [
    "api key",
    "api_key",
    "authentication",
    "rate limit",
    "quota",
    "credentials",
    "cannot connect",
    "not configured",
    "billing",
    "econnrefused",
    "enotfound",
    "unauthorized",
    "429",
    "could not resolve",
    "network",
    "timeout",
    "no providers",
    "invalid api",
    "missing api",
    "google_application_credentials",
    "application default credentials",
    "service account",
    "project_id",
    "default credentials",
  ].some((p) => lower.includes(p));
}
