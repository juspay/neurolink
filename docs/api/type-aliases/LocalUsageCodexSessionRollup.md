[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / LocalUsageCodexSessionRollup

# Type Alias: LocalUsageCodexSessionRollup

> **LocalUsageCodexSessionRollup** = `object`

Defined in: [types/localUsage.ts:197](https://github.com/juspay/neurolink/blob/release/src/lib/types/localUsage.ts#L197)

One Codex rollout reduced to its session-level totals.

The token figures here are the session's CUMULATIVE counter, not a sum of
per-turn values — see `codexReader.ts` for why summing overstates by ~63%.

## Properties

### model?

> `optional` **model?**: `string`

Defined in: [types/localUsage.ts:198](https://github.com/juspay/neurolink/blob/release/src/lib/types/localUsage.ts#L198)

---

### input

> **input**: `number`

Defined in: [types/localUsage.ts:199](https://github.com/juspay/neurolink/blob/release/src/lib/types/localUsage.ts#L199)

---

### output

> **output**: `number`

Defined in: [types/localUsage.ts:200](https://github.com/juspay/neurolink/blob/release/src/lib/types/localUsage.ts#L200)

---

### cached

> **cached**: `number`

Defined in: [types/localUsage.ts:201](https://github.com/juspay/neurolink/blob/release/src/lib/types/localUsage.ts#L201)

---

### billableEvents

> **billableEvents**: `number`

Defined in: [types/localUsage.ts:203](https://github.com/juspay/neurolink/blob/release/src/lib/types/localUsage.ts#L203)

token_count events where the cumulative total actually advanced.
