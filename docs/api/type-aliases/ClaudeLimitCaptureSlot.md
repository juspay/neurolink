[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ClaudeLimitCaptureSlot

# Type Alias: ClaudeLimitCaptureSlot

> **ClaudeLimitCaptureSlot** = `object`

Per-request capture slot the Anthropic fetch wrapper writes into.

Held in AsyncLocalStorage for the duration of a generate/stream call, so
concurrent calls on one provider instance cannot see each other's limits.
`headers` keeps the raw response header bag so the AI-SDK model adapter can
report real response headers.

## Properties

### snapshot?

> `optional` **snapshot?**: [`ClaudeLimitSnapshot`](ClaudeLimitSnapshot.md)

---

### headers?

> `optional` **headers?**: `Record`\<`string`, `string`\>
