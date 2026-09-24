[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CodexFallbackStream

# Type Alias: CodexFallbackStream

> **CodexFallbackStream** = `object`

Defined in: [types/codex.ts:215](https://github.com/juspay/neurolink/blob/release/src/lib/types/codex.ts#L215)

Incremental Claude frames and explicit upstream cancellation.

## Properties

### frames

> **frames**: `AsyncGenerator`\<`string`, [`CodexFallbackResult`](CodexFallbackResult.md)\>

Defined in: [types/codex.ts:216](https://github.com/juspay/neurolink/blob/release/src/lib/types/codex.ts#L216)

---

### cancel

> **cancel**: (`reason?`) => `Promise`\<`void`\>

Defined in: [types/codex.ts:217](https://github.com/juspay/neurolink/blob/release/src/lib/types/codex.ts#L217)

#### Parameters

##### reason?

`unknown`

#### Returns

`Promise`\<`void`\>
