# Codex (ChatGPT) Support for NeuroLink Proxy

## Status: Implemented — request path verified, quota path unverified

Codex is supported as a **second subscription pool engine** alongside Claude. The proxy pools multiple ChatGPT accounts and rotates between them automatically, so you never have to switch accounts by hand when one hits its limit.

Verified end-to-end against Codex CLI 0.144.4: a pooled request through the proxy authenticates with a pooled account, passes OpenAI's anti-abuse checks, and streams a live SSE response back from the ChatGPT backend.

---

## 1. Overview

Codex signs in with a ChatGPT account over OAuth and talks to the **ChatGPT backend Responses API** at `https://chatgpt.com/backend-api/codex/responses` — not the standard `api.openai.com` platform API, and not chat-completions.

The proxy exposes that same endpoint locally:

```
POST http://127.0.0.1:<port>/backend-api/codex/responses
```

Point the Codex CLI at it and the proxy takes over account selection:

```
Codex CLI  →  proxy /backend-api/codex/responses
                 ├─ strips the client's own OAuth token
                 ├─ picks a pooled `codex:*` account (fill-first, quota-aware)
                 ├─ attaches that account's Bearer + matching chatgpt-account-id
                 ├─ forwards to chatgpt.com/backend-api/codex
                 └─ relays the SSE stream back unchanged
```

On a 429 or usage-limit the account is cooled until its real reset and the next account is tried — the same behaviour the Claude pool has.

---

## 2. Adding accounts

Codex login works by **importing the credential the Codex CLI already holds**. Log into Codex normally, then import:

```bash
codex login                                  # sign in as account A
neurolink auth login codex --label work      # import it into the pool

codex login                                  # sign in as account B
neurolink auth login codex --label personal  # import that one too
```

Each import reads `~/.codex/auth.json`, decodes the account id / plan / email from the token, and stores it under a `codex:<label>` key in `~/.neurolink/tokens.json`. If you omit `--label`, the account email is used.

List the pool (Codex and Anthropic accounts appear together):

```bash
neurolink auth list
neurolink auth list --refresh    # also fetch fresh usage windows
```

Remove Codex accounts:

```bash
neurolink auth logout codex
```

> Only ChatGPT subscription login (`auth_mode: "chatgpt"`) can be pooled. An API-key Codex install is rejected with a clear message.

---

## 3. Client auto-configuration

When `neurolink proxy start` runs (non-dev), it configures the Codex CLI the same way it configures Claude Code and OpenCode. It appends a marker-delimited block to `~/.codex/config.toml`:

```toml
model_provider = "neurolink"

# >>> neurolink-proxy (managed) >>>
[model_providers.neurolink]
name = "NeuroLink Proxy"
base_url = "http://127.0.0.1:55669/backend-api/codex"
wire_api = "responses"
requires_openai_auth = true
# <<< neurolink-proxy (managed) <<<
```

Your original `model_provider` value is snapshotted to `~/.neurolink/codex-proxy-snapshot.json` and restored on shutdown, so the edit is fully reversible even if the proxy crashes. The managed block is delimited by markers and removed cleanly on clear. If `~/.codex/config.toml` doesn't exist, the step is skipped silently.

Restart Codex after starting the proxy for it to pick up the new provider.

---

## 4. Quota and routing

Codex reports two rate-limit windows — **primary** (short) and **secondary** (weekly) — which map onto the shared `AccountQuota` model as the session and weekly fields respectively. That means Codex reuses the existing cooldown, persistence, and display code rather than duplicating it.

Account ordering is fill-first and quota-aware:

1. Accounts on cooldown sort last.
2. Accounts with **no quota data sort first** — they get probed so they become comparable, rather than being starved.
3. Otherwise, least session utilization first.

Cooldown reasons map to the shared vocabulary: a rejected weekly window cools until its real reset (`weekly`), a rejected primary window until its reset (`session`), and a plain burst limit gets a bounded `transient` cooldown (60 s floor, 15 min ceiling).

Quota and cooldown state are keyed by the **full `codex:` account key**, so a Codex account and an Anthropic account that share a bare label never collide.

---

## 5. Response headers

Every pooled Codex response carries attribution headers:

| Header                               | Meaning                                             |
| ------------------------------------ | --------------------------------------------------- |
| `x-neurolink-account`                | Which pooled account served the request             |
| `x-neurolink-account-type`           | Always `codex-oauth`                                |
| `x-neurolink-served-by`              | Always `codex`                                      |
| `x-neurolink-attempt`                | Which attempt succeeded (1 = first account tried)   |
| `x-neurolink-quota-source`           | `live` when the backend reported quota, else `none` |
| `x-neurolink-quota-session-left-pct` | Remaining primary-window headroom                   |
| `x-neurolink-weekly-left-pct`        | Remaining secondary-window headroom                 |

---

## 6. Error handling

| Condition                    | Behaviour                                                                                   |
| ---------------------------- | ------------------------------------------------------------------------------------------- |
| No Codex accounts configured | `401` with a message pointing at `neurolink auth login codex`                               |
| All accounts cooling         | `429` with a `retry-after` computed from the soonest recovery                               |
| `401` / `403` from upstream  | One forced token refresh, then rotate; a failed refresh disables the account until re-login |
| `429`                        | Cool the account per its reported window, then rotate                                       |
| `5xx` / network              | Rotate to the next account                                                                  |

Access tokens are refreshed proactively when within 5 minutes of expiry, and the rotated refresh token is written back to the store.

---

## 7. Implementation map

| File                                        | Role                                                                                      |
| ------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `src/lib/types/codex.ts`                    | Codex auth-file, token, and rate-limit types                                              |
| `src/lib/auth/codexOAuth.ts`                | Endpoints/constants, `auth.json` import, token refresh, JWT decode, account-id resolution |
| `src/lib/proxy/codexAccountUsage.ts`        | Account enumeration, usage fetch, quota normalisation, header parsing                     |
| `src/lib/server/routes/codexProxyRoutes.ts` | The pool engine: load → order → forward → rotate                                          |
| `src/cli/commands/auth.ts`                  | `auth login codex`, Codex rows in `auth list --refresh`                                   |
| `src/cli/commands/proxy.ts`                 | Route registration, `/backend-api/*` request tracking, `~/.codex/config.toml` management  |

The Anthropic engine in `claudeProxyRoutes.ts` is untouched. The Codex engine is deliberately leaner: it does pre-commit rotation but not the full transient-retry-budget or admission-lease machinery.

---

## 8. Caveats

- **Model ids matter.** The ChatGPT backend rejects models that aren't available to Codex-with-a-ChatGPT-account (e.g. `gpt-5-codex` returns a 400). Use the model your Codex config already uses.
- **Terms of service.** Pooling multiple personal ChatGPT subscriptions through one client fingerprint is the kind of pattern subscription anti-abuse systems are built to detect. The `originator`, `installation_id`, user-agent, and turn-metadata headers are all correlatable. Pooling your own accounts is materially different from sharing across people — weigh the account-ban risk accordingly.
- **Native browser login is not implemented.** The verified path is importing an existing `codex login` credential. The OAuth constants (authorize URL, PKCE, scopes) are present in `codexOAuth.ts` for a future native flow.
- **Quota-aware ordering is unverified against the live backend.** The usage endpoint and the rate-limit header shape were reconstructed from a capture, not confirmed end to end. If either is wrong, `fetchCodexAccountUsage` returns no quota, `x-neurolink-quota-source` reads `none`, and ordering degenerates to insertion order while every 429 falls back to the 15-minute transient cooldown. Rotation still works; it is simply not quota-aware. Verify with `neurolink auth list --refresh` — a `codex usage …` error line per account means the quota path is not live.
- **SSE usage-limit signals are not acted on.** Only an HTTP 429 triggers a cooldown and rotation. A `200` response whose SSE stream carries `usage_limit_reached` (or the workspace-credit variants) is relayed to the client untouched, so the account is neither cooled nor rotated away from. HTTP-level exhaustion is handled; in-stream exhaustion is not.
- **Client fingerprint is forwarded verbatim.** The proxy replaces the caller's credentials but does not regenerate `originator`, `installation_id`, `session-id`, or turn metadata per account, so every pooled account shares the client's fingerprint. This is what makes the terms-of-service point above concrete.

## Model discovery

The Codex CLI refreshes its model list on every invocation:

```
GET /backend-api/codex/models?client_version=<cli-version>
```

The proxy relays that upstream to `chatgpt.com/backend-api/codex/models` using a
pooled account, forwarding the CLI's own query parameters.

**It relays rather than synthesises**, unlike the Claude and OpenAI `/v1/models`
routes, which build their lists locally from the model router. Which Codex
models an account can reach is a property of that account — plan tier, rollout
state — not something this proxy knows, so a locally-built list would be a guess
that reads as authoritative.

Two details matter to anyone touching it:

- **`client_version` is required upstream.** Omit it and ChatGPT answers `400`
  with a pydantic `Field required` on `('query', 'client_version')`. The query
  is rebuilt from `ctx.query`; `ctx.path` carries no query string, and reading it
  from there drops the parameter silently.
- **Discovery is side-effect free.** No cooldown is recorded and no quota is
  consumed, so the once-per-invocation refresh cannot influence routing for real
  traffic. A cooling account is still allowed to answer it — being rate-limited
  for completions does not make an account unable to say which models exist.

Before this route existed the request 404'd, and the CLI printed
`failed to refresh available models: unexpected status 404 Not Found` on every
run before silently falling back to a default model — quietly ignoring the model
the user had configured.
