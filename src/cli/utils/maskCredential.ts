/**
 * Unified credential masking utility for CLI setup commands.
 *
 * Preserves known provider prefixes (sk-, sk-ant-, AIza, AKIA) so
 * users can identify which key is configured, while hiding the secret
 * portion with asterisks.
 *
 * @param credential - Raw API key or secret
 * @returns Masked string, e.g. "sk-****abcd"
 */
export function maskCredential(credential: string): string {
  if (!credential || credential.length <= 8) {
    return "****";
  }

  // Provider-specific prefixes ordered longest-first so "sk-ant-" wins over "sk-"
  const knownPrefixes = ["sk-ant-", "sk-", "AIza", "AKIA"];
  const prefix =
    knownPrefixes.find((p) => credential.startsWith(p)) ??
    credential.slice(0, 4);

  const end = credential.slice(-4);
  const stars = "*".repeat(Math.max(4, credential.length - prefix.length - 4));
  return `${prefix}${stars}${end}`;
}
