[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CodexFallbackStream

# Type Alias: CodexFallbackStream

> **CodexFallbackStream** = `object`

Defined in: [types/codex.ts:195](https://github.com/juspay/neurolink/blob/release/src/lib/types/codex.ts#L195)

Incremental Claude frames and explicit upstream cancellation.

## Properties

### frames

> **frames**: `AsyncGenerator`\<`string`, [`CodexFallbackResult`](CodexFallbackResult.md)\>

Defined in: [types/codex.ts:196](https://github.com/juspay/neurolink/blob/release/src/lib/types/codex.ts#L196)

---

### cancel

> **cancel**: (`reason?`) => `Promise`\<`void`\>

Defined in: [types/codex.ts:197](https://github.com/juspay/neurolink/blob/release/src/lib/types/codex.ts#L197)

#### Parameters

##### reason?

`unknown`

#### Returns

`Promise`\<`void`\>
