# SSE bisection findings — Codex CLI vs. a local replay listener

Companion doc for `scripts/codex-replay-listener.ts` (Phase 1, Task 4 of the
reverse-fallback plan: "SSE bisection against the real client").

## Source-doc discrepancy (read this first)

The task pointed at `docs/reverse-fallback-plan.md`, section "The event table
transfers, inverted", as the starting candidate list. That file does not
exist anywhere in this worktree or its history:

```
$ find . -iname "reverse-fallback-plan*"        # no output
$ git log --all --oneline -- '**/reverse-fallback-plan.md'   # no output
$ git log --all --diff-filter=A --name-only --oneline | grep -i reverse-fallback  # no output
```

The sandbox for this session is also scoped to this one worktree — sibling
worktrees (including `fix/reverse-fallback-phase0`, which does exist per
`git worktree list`) are not readable from here, so if the doc is sitting
uncommitted in one of those, it wasn't reachable either. The candidate event
list below is reconstructed instead from the two things that genuinely do
exist and describe the real wire shape on this branch:

- `src/lib/proxy/codexUsage.ts` — `inspectEvidence()` is written against a
  captured live `codex exec` stream (per its own header comment, captured
  2026-08-21) and enumerates every event type the proxy has ever had to
  recognise on this wire.
- `test/fixtures/codex-response-usage.sse` — one captured real
  `response.completed` frame, and the doc comment above `extractCodexUsage`
  noting `response.created` arrives first carrying `usage: null`.
- `test/fixtures/codex-request-*.json` — the request-side shape corpus this
  task named explicitly, confirmed committed on this branch
  (`3a5d48f3 test: add synthetic Codex CLI wire-capture fixture corpus`).

## Candidate event set (starting list)

Reconstructed from `codexUsage.ts`'s `inspectEvidence()`:

| Event                                               | Carries                                                           | Required for `extractCodexUsage`?                                                 |
| --------------------------------------------------- | ----------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `response.created`                                  | `response.usage: null`                                            | No — explicitly documented as ignorable for usage purposes                        |
| `response.in_progress`                              | same null-usage shape                                             | No — not referenced anywhere in `codexUsage.ts`                                   |
| `response.output_item.added`                        | the item being built (message / function_call / custom_tool_call) | No — `usefulOutputItem()` on `.added`/`.done` is evidence-only, not usage-bearing |
| `response.content_part.added` / `.done`             | a text/refusal part                                               | No                                                                                |
| `response.output_text.delta` / `.done`              | streamed assistant text                                           | No                                                                                |
| `response.function_call_arguments.delta` / `.done`  | streamed tool args                                                | No                                                                                |
| `response.custom_tool_call_input.delta` / `.done`   | streamed custom-tool args                                         | No                                                                                |
| `response.completed`                                | `response.usage`, `response.output[]`                             | **Yes** — the only event `extractCodexUsage` and `evidence.completed` key off     |
| `error` / `response.failed` / `response.incomplete` | error/incomplete details                                          | Terminal alternative to `.completed`                                              |

`codexUsage.ts` itself already establishes, by construction, that the proxy's
own usage/evidence tap treats every event _before_ `response.completed` as
optional — it keeps "the last non-null result" and only flips
`evidence.completed = true` on `response.completed`. That is proxy-side
tolerance, not CLI-side tolerance, which is exactly the gap this listener is
built to close: the proxy not needing an event says nothing about whether the
**Codex CLI** needs it to keep the turn moving (print the assistant message,
run a tool call, exit 0) rather than stalling or erroring.

## Bisection scripts implemented

`scripts/codex-replay-listener.ts --script <name>`:

| Script                 | Removes vs. `full`                                                                                                    | Tests                                                                                                                                                                          |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `full`                 | —                                                                                                                     | Baseline: full assistant-message turn, all 9 events                                                                                                                            |
| `no-created`           | `response.created`                                                                                                    | Is `response.created` mandatory before `.completed`?                                                                                                                           |
| `no-in-progress`       | `response.in_progress`                                                                                                | Is `response.in_progress` mandatory?                                                                                                                                           |
| `no-output-item-added` | `response.output_item.added` **and** `.done`                                                                          | Is `output_item.added` mandatory before `.completed`?                                                                                                                          |
| `terminal-only`        | everything except `response.completed`                                                                                | Does the CLI accept a single terminal event with no preamble at all?                                                                                                           |
| `tool-call`            | (additive) issues a `function_call` turn instead of a text turn, with `id`/`call_id` = `toolu_replay0000000000000000` | Does a `toolu_`-prefixed id round-trip through the CLI unmodified (echoed back correctly in the next turn's `function_call_output.call_id`, or in the CLI's exec/approval UI)? |

Each run: start the listener with one `--script`, point an isolated
`CODEX_HOME` at it (exact `config.toml`/`auth.json` snippet is in the
listener's header comment — mirrors the managed block
`neurolink proxy start` writes per `docs/features/codex-proxy-support.md`
§3), run `codex exec "<prompt>"`, and record: did the CLI print output /
exit 0, or hang / error? The listener's console + `--log-file` JSONL log
records exactly which event types it sent per request
(`sentEventTypes`), so a hang can be matched back to the omitted event.

## What was actually run — real results (2026-09-22, superseding the hypothesis below)

A later, unsandboxed session ran the listener against the real
`codex-cli 0.155.1` binary (isolated `CODEX_HOME`, dummy `replay` provider
per the header comment — never touched a real account). Three rounds:

| Script                                                                 | Real CLI behavior observed                                                                                                                                                                                                                                                                                                                                                                                                        |
| ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `full` (baseline, all 9 events)                                        | Works. Printed `Hello from the replay listener.`, exit 0. Confirms the harness and request/response shape are genuinely compatible with `codex_exec/0.155.1` — the request headers the listener received matched the plan's captured wire sample exactly (`x-codex-beta-features: remote_compaction_v2`, `x-openai-internal-codex-responses-lite: true`, `session-id`/`thread-id` present).                                       |
| `terminal-only` (only `response.completed`)                            | **Fails silently.** The CLI accepted the request (200, listener logged `emittedCompleted: true`) but printed **no assistant text at all** — no error, no output, just an empty turn. So the weakest hypothesis in this doc ("if the CLI accepts one terminal event, every weaker question is settled") is **wrong**: the CLI needs the streaming preamble to actually surface a message, even though it doesn't crash without it. |
| `no-output-item-added` (skips `.added`/`.done`, keeps the text deltas) | **Confirmed mandatory, with a hard error.** The CLI's own log printed `ERROR codex_core::util: OutputTextDelta without active item` — once per delta event received. This is a direct hit on the exact coupling this doc predicted: deltas are indexed by the `item_id` established at `.added` time, and the CLI errors immediately when a delta arrives with no active item.                                                    |

**Conclusion:** `response.output_item.added` is a hard requirement before any
`response.output_text.delta`, not merely a UI nicety — confirmed by the
CLI's own internal error, not inferred. `response.completed` alone is
necessary but not sufficient: it terminates the turn cleanly but does not by
itself cause the CLI to render output, so a serializer cannot skip straight
to it as an optimization. `no-created` / `no-in-progress` / `tool-call`
(id round-trip) were not run in this pass — the two results above already
answer the highest-value question in the table (the serializer's minimum
required event set includes at least `created` → `in_progress` →
`output_item.added` → deltas → `output_item.done` → `completed`; it cannot
compress further at the `output_item.added` boundary). Re-run the remaining
scripts before finalizing task 8's serializer if the `created`/`in_progress`
question or the tool-call id round-trip becomes load-bearing for that task.

## What was actually run in the sandboxed dispatch that wrote this file

**Nothing.** That session's Bash tool was sandboxed to read-only
introspection commands (`pwd`, `node --version`, etc.); any command that
executes code — `node -e`, `node --check <file>`, `pnpm exec tsx`, even
`pnpm --version` — returned "This command requires approval" with no
interactive approval path available, and `codex --help` / `codex --version`
were blocked the same way. The real run above happened in a later,
unsandboxed session instead.

## Reasoning behind the hypothesis

- `response.created`/`response.in_progress` carry no information the CLI
  hasn't already generated itself (it built the request); they exist so a
  _streaming UI_ can show "thinking" state before the first token. A CLI
  whose primary UX is the assistant's text/tool-call stream has no
  structural reason to require them before `output_item.added`, though it
  may use them for progress-spinner cosmetics that a bisection run would
  surface as a visual glitch, not a hang.
- `output_item.added` announces an item _before_ its first delta so a
  streaming UI can render an empty placeholder. A CLI that only acts once an
  item reaches `.done` (or once `response.completed` supplies the full
  `output[]` array) would tolerate its absence structurally — but a CLI that
  indexes deltas by `item_id` established at `.added` time would break
  immediately on `no-output-item-added`, since every delta in `full` still
  references `ITEM_ID` before it. That coupling is exactly why
  `no-output-item-added` is scripted as a **separate, standalone** bisection
  point in this listener rather than assumed safe.
- `response.completed` is the one event every consumer in this codebase
  (`codexUsage.ts`) treats as load-bearing, and it alone carries the full,
  non-streamed `output[]` + `usage` — so `terminal-only` is the most
  informative single experiment: if the CLI is willing to synthesize its
  entire turn from one terminal event, that settles every weaker
  "is event X mandatory" question in the table at once.
- Tool-call id passthrough: nothing in `codexUsage.ts`,
  `test/fixtures/codex-request-tool-result-turn.json` (which uses
  `call_synthetic_0001`, itself not a `call_...`-shaped OpenAI id despite the
  `call_` prefix coincidence — it's a synthetic label), or the OpenAI
  Responses API's public documentation of `call_id` suggests any
  server-side format validation. Ids are opaque correlation strings. The
  `toolu_` prefix (Anthropic's) is therefore expected to round-trip
  unmodified — this listener's `tool-call` script is the mechanism to
  confirm or refute that for the actual `codex_cli_rs` binary, which is the
  one place this assumption could be wrong (a client-side regex/allowlist on
  ids would be a CLI implementation detail, not an API contract).
