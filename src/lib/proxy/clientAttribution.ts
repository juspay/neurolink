/**
 * Which CLI is calling, from its User-Agent.
 *
 * The proxy already computed a client label for trace spans, but it only
 * distinguished `claude-cli/` from `ai/` and dropped the result into an OTel
 * attribute. Nothing persisted it, so usage could be attributed to an account
 * but never to the tool that spent it — the question a pooled-subscription
 * operator actually asks.
 *
 * Two rules keep this honest as the roster grows:
 *
 * - **Only prefixes observed in real traffic appear here.** A guessed mapping
 *   that never matches is indistinguishable from one that works, and silently
 *   files a client under the wrong name if the guess collides.
 * - **The raw header is persisted alongside the derived name.** An unrecognised
 *   client is then still attributable by its own User-Agent rather than
 *   collapsing into one bucket with every other unknown.
 */

/** Longest prefix wins, so a more specific match cannot be shadowed. */
const CLIENT_PREFIXES: ReadonlyArray<readonly [string, string]> = [
  // Verified against this machine's proxy logs.
  ["claude-cli/", "claude-code"],
  // Verified: the AI SDK's own UA, used by NeuroLink's SDK callers.
  ["ai/", "sdk"],
];

/** Cap stored User-Agents. They are attacker-influenced and unbounded. */
const MAX_USER_AGENT_CHARS = 200;

/**
 * Derive a stable client name, or "unknown" when the header is absent or
 * unrecognised. Never throws: attribution must not be able to fail a request.
 */
export function detectProxyClient(userAgent: string | undefined): string {
  if (!userAgent) {
    return "unknown";
  }
  const ua = userAgent.trim();
  let best: string | undefined;
  let bestLength = 0;
  for (const [prefix, name] of CLIENT_PREFIXES) {
    if (ua.startsWith(prefix) && prefix.length > bestLength) {
      best = name;
      bestLength = prefix.length;
    }
  }
  return best ?? "unknown";
}

/** Read the User-Agent case-insensitively and bound it for storage. */
export function readUserAgent(
  headers: Record<string, string> | undefined,
): string | undefined {
  if (!headers) {
    return undefined;
  }
  for (const [name, value] of Object.entries(headers)) {
    if (name.toLowerCase() === "user-agent" && typeof value === "string") {
      const trimmed = value.trim();
      return trimmed ? trimmed.slice(0, MAX_USER_AGENT_CHARS) : undefined;
    }
  }
  return undefined;
}

/** The pair every proxy engine attaches to its request log entry. */
export function buildClientAttribution(
  headers: Record<string, string> | undefined,
): { clientApp: string; userAgent?: string } {
  const userAgent = readUserAgent(headers);
  return { clientApp: detectProxyClient(userAgent), userAgent };
}
