[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / LocalUsageCodexSessionRollup

# Type Alias: LocalUsageCodexSessionRollup

> **LocalUsageCodexSessionRollup** = `object`

Defined in: [types/localUsage.ts:177](https://github.com/juspay/neurolink/blob/release/src/lib/types/localUsage.ts#L177)

One Codex rollout reduced to its session-level totals.

The token figures here are the session's CUMULATIVE counter, not a sum of
per-turn values — see `codexReader.ts` for why summing overstates by ~63%.

## Properties

### model?

> `optional` **model?**: `string`

Defined in: [types/localUsage.ts:178](https://github.com/juspay/neurolink/blob/release/src/lib/types/localUsage.ts#L178)

---

### input

> **input**: `number`

Defined in: [types/localUsage.ts:179](https://github.com/juspay/neurolink/blob/release/src/lib/types/localUsage.ts#L179)

---

### output

> **output**: `number`

Defined in: [types/localUsage.ts:180](https://github.com/juspay/neurolink/blob/release/src/lib/types/localUsage.ts#L180)

---

### cached

> **cached**: `number`

Defined in: [types/localUsage.ts:181](https://github.com/juspay/neurolink/blob/release/src/lib/types/localUsage.ts#L181)

---

### billableEvents

> **billableEvents**: `number`

Defined in: [types/localUsage.ts:183](https://github.com/juspay/neurolink/blob/release/src/lib/types/localUsage.ts#L183)

token_count events where the cumulative total actually advanced.
