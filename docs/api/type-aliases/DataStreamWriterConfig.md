[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / DataStreamWriterConfig

# Type Alias: DataStreamWriterConfig

> **DataStreamWriterConfig** = `object`

Configuration for DataStreamWriter.

## Properties

### write

> **write**: (`chunk`) => `void` \| `Promise`\<`void`\>

#### Parameters

##### chunk

`string`

#### Returns

`void` \| `Promise`\<`void`\>

---

### close?

> `optional` **close?**: () => `void` \| `Promise`\<`void`\>

#### Returns

`void` \| `Promise`\<`void`\>

---

### format?

> `optional` **format?**: `"sse"` \| `"ndjson"`

---

### includeTimestamps?

> `optional` **includeTimestamps?**: `boolean`
