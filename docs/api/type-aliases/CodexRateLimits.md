[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CodexRateLimits

# Type Alias: CodexRateLimits

> **CodexRateLimits** = `object`

Defined in: [types/codex.ts:77](https://github.com/juspay/neurolink/blob/release/src/lib/types/codex.ts#L77)

Codex rate-limit block: a primary (short) and secondary (long) window.

## Properties

### allowed?

> `optional` **allowed?**: `boolean`

Defined in: [types/codex.ts:78](https://github.com/juspay/neurolink/blob/release/src/lib/types/codex.ts#L78)

---

### limit_reached?

> `optional` **limit_reached?**: `boolean`

Defined in: [types/codex.ts:79](https://github.com/juspay/neurolink/blob/release/src/lib/types/codex.ts#L79)

---

### primary?

> `optional` **primary?**: [`CodexRateLimitWindow`](CodexRateLimitWindow.md) \| `null`

Defined in: [types/codex.ts:80](https://github.com/juspay/neurolink/blob/release/src/lib/types/codex.ts#L80)

---

### secondary?

> `optional` **secondary?**: [`CodexRateLimitWindow`](CodexRateLimitWindow.md) \| `null`

Defined in: [types/codex.ts:81](https://github.com/juspay/neurolink/blob/release/src/lib/types/codex.ts#L81)
