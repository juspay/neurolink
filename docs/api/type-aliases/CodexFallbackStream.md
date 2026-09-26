[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CodexFallbackStream

# Type Alias: CodexFallbackStream

> **CodexFallbackStream** = `object`

Incremental Claude frames and explicit upstream cancellation.

## Properties

### frames

> **frames**: `AsyncGenerator`\<`string`, [`CodexFallbackResult`](CodexFallbackResult.md)\>

---

### cancel

> **cancel**: (`reason?`) => `Promise`\<`void`\>

#### Parameters

##### reason?

`unknown`

#### Returns

`Promise`\<`void`\>
