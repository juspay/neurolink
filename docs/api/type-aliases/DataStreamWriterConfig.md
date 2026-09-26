[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / DataStreamWriterConfig

# Type Alias: DataStreamWriterConfig

> **DataStreamWriterConfig** = `object`

Defined in: [types/server.ts:1447](https://github.com/juspay/neurolink/blob/release/src/lib/types/server.ts#L1447)

Configuration for DataStreamWriter.

## Properties

### write

> **write**: (`chunk`) => `void` \| `Promise`\<`void`\>

Defined in: [types/server.ts:1448](https://github.com/juspay/neurolink/blob/release/src/lib/types/server.ts#L1448)

#### Parameters

##### chunk

`string`

#### Returns

`void` \| `Promise`\<`void`\>

---

### close?

> `optional` **close?**: () => `void` \| `Promise`\<`void`\>

Defined in: [types/server.ts:1449](https://github.com/juspay/neurolink/blob/release/src/lib/types/server.ts#L1449)

#### Returns

`void` \| `Promise`\<`void`\>

---

### format?

> `optional` **format?**: `"sse"` \| `"ndjson"`

Defined in: [types/server.ts:1450](https://github.com/juspay/neurolink/blob/release/src/lib/types/server.ts#L1450)

---

### includeTimestamps?

> `optional` **includeTimestamps?**: `boolean`

Defined in: [types/server.ts:1451](https://github.com/juspay/neurolink/blob/release/src/lib/types/server.ts#L1451)
