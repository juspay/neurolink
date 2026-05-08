[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / DataStreamWriterConfig

# Type Alias: DataStreamWriterConfig

> **DataStreamWriterConfig** = `object`

Defined in: [types/server.ts:1425](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L1425)

Configuration for DataStreamWriter.

## Properties

### write

> **write**: (`chunk`) => `void` \| `Promise`\<`void`\>

Defined in: [types/server.ts:1426](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L1426)

#### Parameters

##### chunk

`string`

#### Returns

`void` \| `Promise`\<`void`\>

---

### close?

> `optional` **close?**: () => `void` \| `Promise`\<`void`\>

Defined in: [types/server.ts:1427](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L1427)

#### Returns

`void` \| `Promise`\<`void`\>

---

### format?

> `optional` **format?**: `"sse"` \| `"ndjson"`

Defined in: [types/server.ts:1428](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L1428)

---

### includeTimestamps?

> `optional` **includeTimestamps?**: `boolean`

Defined in: [types/server.ts:1429](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L1429)
