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

/**
 * Longest prefix wins, so a more specific match cannot be shadowed.
 *
 * Every entry below was read out of this machine's proxy request log or a
 * header capture, never guessed. The measured string is quoted beside each so
 * a future reader can tell an observation from an assumption.
 */
const CLIENT_PREFIXES: ReadonlyArray<readonly [string, string]> = [
  // "claude-cli/2.1.251 (external, cli)"
  ["claude-cli/", "claude-code"],
  // "ai/4.x" — the AI SDK's own UA, used by NeuroLink's SDK callers.
  ["ai/", "sdk"],
  // "opencode/1.3.13 ai-sdk/provider-utils/4.0.21 runtime/bun/1.3.13"
  ["opencode/", "opencode"],
  // "QwenCode/0.17.0 (darwin; arm64)"
  ["QwenCode/", "qwen-code"],
  // "GeminiCLI-tui/0.53.0/gemini-3.1-pro-preview (darwin; arm64; terminal)"
  ["GeminiCLI-", "gemini-cli"],
  // "codex_exec/0.147.0 (Mac OS 26.6.0; arm64)". Only the non-interactive
  // `codex exec` binary has been observed; the interactive TUI may well send a
  // different token, and it is left unmapped until someone measures it rather
  // than pattern-matched on a guess.
  ["codex_exec/", "codex"],
];

/**
 * Deliberately NOT mapped, with the measurement that ruled each one out.
 *
 * Copilot CLI is the one client here that cannot be identified from its
 * User-Agent, and both of the strings it sends are actively unsafe to key on:
 *
 * - `OpenAI/JS 5.20.1` — the stock OpenAI JS SDK UA, sent by every caller of
 *   that SDK. Mapping it to Copilot would file unrelated OpenAI-SDK traffic
 *   under Copilot's name, which is worse than leaving it unattributed.
 - `Mozilla/5.0 (compatible; MSIE 9.0; Windows NT 6.1; Trident/5.0)` — not a
 *   CLI's User-Agent at all. This is what `curl` sends on a machine whose
 *   `~/.curlrc` sets `user-agent`, so every curl-driven caller on such a host
 *   shares it: scripts, agents, health probes. It accounted for the largest
 *   single block of `unknown` rows in the log this table was measured against,
 *   which is exactly what made it tempting.
 *
 *   Recorded because the first pass got this wrong in a way worth naming. The
 *   string was seen arriving at two capture servers during Copilot CLI and
 *   Gemini CLI runs and was written up as "sent by both CLIs". It was neither:
 *   it was the aliveness `curl` fired at each capture server moments before
 *   the CLI, picking up that host's curlrc. The paths gave it away on review —
 *   the Gemini-side hit was a bare `GET /v1beta/models`, which is the probe's
 *   URL and not one the CLI requests. A shared string across two unrelated
 *   clients should have read as "shared dependency or shared tooling", not as
 *   a property of either client.
 *
 * Copilot does send `x-initiator` and `x-interaction-type`, but neither is
 * exclusive to it either. Attributing it needs a signal nobody has found yet,
 * so it stays `unknown` and remains traceable through the stored raw header.
 */

/**
 * The client names this table can produce.
 *
 * Exported so a test can check the roster of CLIs the proxy configures against
 * the roster it can actually name. Those two lists drifted apart silently once
 * already: five configurators shipped while the table still knew only Claude
 * Code, and nothing failed, because an unattributed client looks exactly like
 * a quiet one.
 */
export function getMappedClientNames(): ReadonlySet<string> {
  return new Set(CLIENT_PREFIXES.map(([, name]) => name));
}

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
