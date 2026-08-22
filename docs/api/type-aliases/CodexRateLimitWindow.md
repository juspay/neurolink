[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / CodexRateLimitWindow

# Type Alias: CodexRateLimitWindow

> **CodexRateLimitWindow** = `object`

Defined in: [types/codex.ts:58](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/codex.ts#L58)

One rate-limit window as reported by the Codex backend (primary/secondary).

## Properties

### used_percent?

> `optional` **used_percent?**: `number` \| `null`

Defined in: [types/codex.ts:59](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/codex.ts#L59)

---

### window_minutes?

> `optional` **window_minutes?**: `number` \| `null`

Defined in: [types/codex.ts:60](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/codex.ts#L60)

---

### resets_in_seconds?

> `optional` **resets_in_seconds?**: `number` \| `null`

Defined in: [types/codex.ts:61](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/codex.ts#L61)

---

### reset_after?

> `optional` **reset_after?**: `number` \| `null`

Defined in: [types/codex.ts:65](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/codex.ts#L65)

Seconds until reset. Observed alias of `resets_in_seconds` on some
responses; accepted defensively so a cooldown lands on the real reset
instead of degrading to the transient ceiling.

---

### resets_at?

> `optional` **resets_at?**: `number` \| `null`

Defined in: [types/codex.ts:66](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/codex.ts#L66)
