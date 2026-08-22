[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ClaudeLimitCaptureSlot

# Type Alias: ClaudeLimitCaptureSlot

> **ClaudeLimitCaptureSlot** = `object`

Defined in: [types/subscription.ts:209](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L209)

Per-request capture slot the Anthropic fetch wrapper writes into.

Held in AsyncLocalStorage for the duration of a generate/stream call, so
concurrent calls on one provider instance cannot see each other's limits.
`headers` keeps the raw response header bag so the AI-SDK model adapter can
report real response headers.

## Properties

### snapshot?

> `optional` **snapshot?**: [`ClaudeLimitSnapshot`](ClaudeLimitSnapshot.md)

Defined in: [types/subscription.ts:210](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L210)

---

### headers?

> `optional` **headers?**: `Record`\<`string`, `string`\>

Defined in: [types/subscription.ts:211](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L211)
