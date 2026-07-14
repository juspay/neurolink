import type { AccountAllowlist } from "../types/index.js";

export const LEGACY_ANTHROPIC_ACCOUNT_KEY = "anthropic:legacy-default";
export const ENV_ANTHROPIC_ACCOUNT_KEY = "anthropic:env";

export function normalizeAnthropicAccountKey(value: string): string {
  const trimmed = value.trim().toLowerCase();
  return trimmed.startsWith("anthropic:") ? trimmed : `anthropic:${trimmed}`;
}

export function anthropicAccountKeysEqual(
  left: string,
  right: string,
): boolean {
  return (
    normalizeAnthropicAccountKey(left) === normalizeAnthropicAccountKey(right)
  );
}

export function createAccountAllowlist(
  values?: readonly string[],
): AccountAllowlist | undefined {
  if (values === undefined) {
    return undefined;
  }
  return new Set(
    values
      .map(normalizeAnthropicAccountKey)
      .filter((value) => value !== "anthropic:"),
  );
}

export function isAccountAllowed(
  accountKey: string,
  allowlist?: AccountAllowlist,
): boolean {
  return (
    allowlist === undefined ||
    allowlist.has(normalizeAnthropicAccountKey(accountKey))
  );
}

export function shouldLoadFallbackCredential(
  storedAnthropicAccountCount: number,
  fallbackAccountKey: string,
  allowlist?: AccountAllowlist,
): boolean {
  return (
    storedAnthropicAccountCount === 0 &&
    isAccountAllowed(fallbackAccountKey, allowlist)
  );
}
