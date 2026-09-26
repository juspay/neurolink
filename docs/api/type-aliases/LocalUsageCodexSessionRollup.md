[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / LocalUsageCodexSessionRollup

# Type Alias: LocalUsageCodexSessionRollup

> **LocalUsageCodexSessionRollup** = `object`

One Codex rollout reduced to its session-level totals.

The token figures here are the session's CUMULATIVE counter, not a sum of
per-turn values — see `codexReader.ts` for why summing overstates by ~63%.

## Properties

### model?

> `optional` **model?**: `string`

---

### input

> **input**: `number`

---

### output

> **output**: `number`

---

### cached

> **cached**: `number`

---

### billableEvents

> **billableEvents**: `number`

token_count events where the cumulative total actually advanced.
