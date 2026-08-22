[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / DataStreamWriterConfig

# Type Alias: DataStreamWriterConfig

> **DataStreamWriterConfig** = `object`

Defined in: [types/server.ts:1438](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/server.ts#L1438)

Configuration for DataStreamWriter.

## Properties

### write

> **write**: (`chunk`) => `void` \| `Promise`\<`void`\>

Defined in: [types/server.ts:1439](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/server.ts#L1439)

#### Parameters

##### chunk

`string`

#### Returns

`void` \| `Promise`\<`void`\>

---

### close?

> `optional` **close?**: () => `void` \| `Promise`\<`void`\>

Defined in: [types/server.ts:1440](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/server.ts#L1440)

#### Returns

`void` \| `Promise`\<`void`\>

---

### format?

> `optional` **format?**: `"sse"` \| `"ndjson"`

Defined in: [types/server.ts:1441](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/server.ts#L1441)

---

### includeTimestamps?

> `optional` **includeTimestamps?**: `boolean`

Defined in: [types/server.ts:1442](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/server.ts#L1442)
