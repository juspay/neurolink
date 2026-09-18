[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CodexFallbackStream

# Type Alias: CodexFallbackStream

> **CodexFallbackStream** = `object`

Defined in: [types/codex.ts:206](https://github.com/juspay/neurolink/blob/release/src/lib/types/codex.ts#L206)

Incremental Claude frames and explicit upstream cancellation.

## Properties

### frames

> **frames**: `AsyncGenerator`\<`string`, [`CodexFallbackResult`](CodexFallbackResult.md)\>

Defined in: [types/codex.ts:207](https://github.com/juspay/neurolink/blob/release/src/lib/types/codex.ts#L207)

---

### cancel

> **cancel**: (`reason?`) => `Promise`\<`void`\>

Defined in: [types/codex.ts:208](https://github.com/juspay/neurolink/blob/release/src/lib/types/codex.ts#L208)

#### Parameters

##### reason?

`unknown`

#### Returns

`Promise`\<`void`\>
