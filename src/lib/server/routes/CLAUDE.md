# Proxy pool engines (src/lib/server/routes)

Loaded automatically when working under `src/lib/server/routes/`. Moved out of the root CLAUDE.md.

The proxy runs two independent subscription pool engines that share the token
store and the cooldown/quota persistence layer:

|                    | Anthropic (Claude)              | Codex (ChatGPT)                           |
| ------------------ | ------------------------------- | ----------------------------------------- |
| Inbound route      | `POST /v1/messages`             | `POST /backend-api/codex/responses`       |
| Upstream           | `api.anthropic.com/v1/messages` | `chatgpt.com/backend-api/codex/responses` |
| Wire format        | Anthropic Messages              | OpenAI Responses                          |
| Token-store prefix | `anthropic:`                    | `codex:`                                  |
| Quota windows      | unified 5h / 7d                 | primary / secondary                       |

Both engines key **cooldowns** and **quota** by the full account key
(`anthropic:foo`, `codex:foo`). The Anthropic side used to key quota by the bare
label (`foo`), and snapshots saved that way are still in
`~/.neurolink/account-quotas.json` on users' machines, so it reads
`persisted[account.key] ?? persisted[account.label]` and writes under
`account.key`: a legacy snapshot is picked up, and replaced on the next save.
`codex:foo` cannot collide with a bare Anthropic label, because no bare label
contains a `:` prefix. Use the full key in new code, and keep the label fallback
when reading Anthropic quota until the legacy snapshots are gone.

When adding a third provider, follow the Codex pattern: a new
`<provider>OAuth.ts`, a `<provider>AccountUsage.ts` quota parser, and a
`<provider>ProxyRoutes.ts` engine — do not modify the Anthropic hot path.
See `docs/features/codex-proxy-support.md`.
