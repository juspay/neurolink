[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CodexRateLimitWindow

# Type Alias: CodexRateLimitWindow

> **CodexRateLimitWindow** = `object`

Defined in: [types/codex.ts:62](https://github.com/juspay/neurolink/blob/release/src/lib/types/codex.ts#L62)

One rate-limit window as reported by the Codex backend (primary/secondary).

## Properties

### used_percent?

> `optional` **used_percent?**: `number` \| `null`

Defined in: [types/codex.ts:63](https://github.com/juspay/neurolink/blob/release/src/lib/types/codex.ts#L63)

---

### window_minutes?

> `optional` **window_minutes?**: `number` \| `null`

Defined in: [types/codex.ts:64](https://github.com/juspay/neurolink/blob/release/src/lib/types/codex.ts#L64)

---

### resets_in_seconds?

> `optional` **resets_in_seconds?**: `number` \| `null`

Defined in: [types/codex.ts:65](https://github.com/juspay/neurolink/blob/release/src/lib/types/codex.ts#L65)

---

### reset_after?

> `optional` **reset_after?**: `number` \| `null`

Defined in: [types/codex.ts:69](https://github.com/juspay/neurolink/blob/release/src/lib/types/codex.ts#L69)

Seconds until reset. Observed alias of `resets_in_seconds` on some
responses; accepted defensively so a cooldown lands on the real reset
instead of degrading to the transient ceiling.

---

### resets_at?

> `optional` **resets_at?**: `number` \| `null`

Defined in: [types/codex.ts:70](https://github.com/juspay/neurolink/blob/release/src/lib/types/codex.ts#L70)
