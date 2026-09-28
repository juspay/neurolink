[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CodexResponseStream

# Type Alias: CodexResponseStream

> **CodexResponseStream** = `object`

Incremental Codex-shape SSE frames and the terminal envelope they resolve to.

## Properties

### frames

> **frames**: `AsyncGenerator`\<`string`, [`CodexResponseEnvelope`](CodexResponseEnvelope.md)\>

---

### cancel

> **cancel**: (`reason?`) => `Promise`\<`void`\>

#### Parameters

##### reason?

`unknown`

#### Returns

`Promise`\<`void`\>
