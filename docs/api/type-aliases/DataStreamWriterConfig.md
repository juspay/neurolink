[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / DataStreamWriterConfig

# Type Alias: DataStreamWriterConfig

> **DataStreamWriterConfig** = `object`

Defined in: [types/server.ts:1428](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/server.ts#L1428)

Configuration for DataStreamWriter.

## Properties

### write

> **write**: (`chunk`) => `void` \| `Promise`\<`void`\>

Defined in: [types/server.ts:1429](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/server.ts#L1429)

#### Parameters

##### chunk

`string`

#### Returns

`void` \| `Promise`\<`void`\>

---

### close?

> `optional` **close?**: () => `void` \| `Promise`\<`void`\>

Defined in: [types/server.ts:1430](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/server.ts#L1430)

#### Returns

`void` \| `Promise`\<`void`\>

---

### format?

> `optional` **format?**: `"sse"` \| `"ndjson"`

Defined in: [types/server.ts:1431](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/server.ts#L1431)

---

### includeTimestamps?

> `optional` **includeTimestamps?**: `boolean`

Defined in: [types/server.ts:1432](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/server.ts#L1432)
