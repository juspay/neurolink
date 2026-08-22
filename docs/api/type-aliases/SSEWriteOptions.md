[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SSEWriteOptions

# Type Alias: SSEWriteOptions

> **SSEWriteOptions** = `object`

Defined in: [types/server.ts:847](https://github.com/juspay/neurolink/blob/release/src/lib/types/server.ts#L847)

SSE write options

## Properties

### event?

> `optional` **event?**: `string`

Defined in: [types/server.ts:849](https://github.com/juspay/neurolink/blob/release/src/lib/types/server.ts#L849)

Event name

---

### data

> **data**: `string` \| `object`

Defined in: [types/server.ts:852](https://github.com/juspay/neurolink/blob/release/src/lib/types/server.ts#L852)

Event data (will be JSON stringified if object)

---

### id?

> `optional` **id?**: `string`

Defined in: [types/server.ts:855](https://github.com/juspay/neurolink/blob/release/src/lib/types/server.ts#L855)

Event ID

---

### retry?

> `optional` **retry?**: `number`

Defined in: [types/server.ts:858](https://github.com/juspay/neurolink/blob/release/src/lib/types/server.ts#L858)

Retry interval in milliseconds
