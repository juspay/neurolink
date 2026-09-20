# Fallback Context Truncation Design

## Goal

Cap per-request input cost on fallback traffic by truncating conversation history at a configured trigger, well below any provider's context ceiling. The context window is a refusal boundary; the truncation trigger is the cost control.

## Cost rationale

The fallback chain now prefers `vertex/claude-opus-4-6`, whose per-token input price is the highest in the chain. Letting a session drift toward ~983,000 input tokens bills that full amount on every subsequent turn. Truncating at 700,000 and reducing to 650,000 bounds the recurring per-turn input cost and leaves headroom before the hard ceiling.

## Numbers

Thresholds are per model. Vertex accepts at least 800,000 input tokens, so its
values are a spending decision rather than a capacity one and stay open until
measured; the Codex pair below does not transfer to it.

| Setting                            |          Value | Meaning                               |
| ---------------------------------- | -------------: | ------------------------------------- |
| Hard ceiling (`contextWindow`)     |      1,000,000 | Refusal boundary only; never a target |
| Truncation trigger (codex)         |        700,000 | Above this, history is reduced        |
| Truncation target (codex)          |        650,000 | Reduce to at or below this            |
| Truncation trigger/target (vertex) | **unresolved** | Cost decision; set from telemetry     |
| Output/reasoning reserve           |         16,384 | Counted inside the total reservation  |

Trigger and target differ deliberately. A single threshold would re-truncate on nearly every turn; the 50,000-token gap provides hysteresis so truncation runs occasionally instead of continuously.

## Placement

Truncation must run where it covers **every** fallback provider, because `vertex/claude-opus-4-6` is now the first attempt and does not pass through the Codex conversion module. A hook confined to `codexFallback.ts` would save nothing on the path traffic takes first.

## Preservation rules

Never removed:

- system instructions,
- active tool definitions and tool choice,
- the latest user turn,
- any `tool_use` whose `tool_result` is retained, and any `tool_result` whose `tool_use` is retained.

History is removed oldest-first in whole units. A unit is a complete turn or a complete tool-call batch; parallel calls and their outputs are one unit.

## Failure mode

If the preserved fixed context alone still exceeds the target after every removable unit is dropped, fail locally with the typed non-retryable code `proxy_context_compaction_failed`. Never silently dispatch above the trigger, and never emit an orphaned tool item.

## Observability

Record counts only: trigger, target, estimated tokens before and after, units removed, and whether preservation held. Never log message content, tool arguments, or results.
