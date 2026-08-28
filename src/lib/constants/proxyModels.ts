/**
 * Model IDs the proxy advertises when no routing config narrows the list.
 *
 * Two consumers need the same answer and must not drift apart:
 *
 *   - `proxyTranslationEngine` serves them from `GET /v1/models`.
 *   - The OpenCode client configurator writes them into `provider.neurolink.
 *     models`, because OpenCode resolves a `--model` against that map alone.
 *     It does not call `/v1/models`, so an empty map means every model id is
 *     unknown and `opencode run` fails with `ProviderModelNotFoundError`
 *     before a request is ever made.
 *
 * Format matches the IDs used throughout `src/lib/models/` and
 * `src/lib/constants/` (e.g. `claude-3-5-haiku-20241022`, not
 * `claude-haiku-3.5-20241022`).
 *
 * This is the no-router default. A proxy configured with explicit
 * `routing.model-mappings` serves those instead, and a config written from
 * this list will not mention them — a limitation worth knowing, but strictly
 * better than the empty map it replaces.
 */
export const DEFAULT_PROXY_MODEL_IDS: readonly string[] = [
  // Claude 4-series (current generation, hyphen-suffix family)
  "claude-opus-4-6",
  "claude-sonnet-4-6",
  "claude-haiku-4-5",
  // Claude 4 dated variant
  "claude-sonnet-4-20250514",
  // Claude 3.5-series (canonical Anthropic form: claude-3-5-{variant}-{date})
  "claude-3-5-sonnet-20241022",
  "claude-3-5-haiku-20241022",
  // OpenAI / Google for translated-fallback users
  "gpt-4o",
  "gemini-2.5-pro",
  "gemini-2.5-flash",
];
