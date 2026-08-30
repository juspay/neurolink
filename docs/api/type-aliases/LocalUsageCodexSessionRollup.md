[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / LocalUsageCodexSessionRollup

# Type Alias: LocalUsageCodexSessionRollup

> **LocalUsageCodexSessionRollup** = `object`

Defined in: [types/localUsage.ts:266](https://github.com/juspay/neurolink/blob/release/src/lib/types/localUsage.ts#L266)

One Codex rollout reduced to its session-level totals.

The token figures here are the session's CUMULATIVE counter, not a sum of
per-turn values — see `codexReader.ts` for why summing overstates by ~63%.

## Properties

### model?

> `optional` **model?**: `string`

Defined in: [types/localUsage.ts:267](https://github.com/juspay/neurolink/blob/release/src/lib/types/localUsage.ts#L267)

---

### input

> **input**: `number`

Defined in: [types/localUsage.ts:268](https://github.com/juspay/neurolink/blob/release/src/lib/types/localUsage.ts#L268)

---

### output

> **output**: `number`

Defined in: [types/localUsage.ts:269](https://github.com/juspay/neurolink/blob/release/src/lib/types/localUsage.ts#L269)

---

### cached

> **cached**: `number`

Defined in: [types/localUsage.ts:270](https://github.com/juspay/neurolink/blob/release/src/lib/types/localUsage.ts#L270)

---

### billableEvents

> **billableEvents**: `number`

Defined in: [types/localUsage.ts:272](https://github.com/juspay/neurolink/blob/release/src/lib/types/localUsage.ts#L272)

token_count events where the cumulative total actually advanced.
