[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / BodyParserConfig

# Type Alias: BodyParserConfig

> **BodyParserConfig** = `object`

Defined in: [types/server.ts:154](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/server.ts#L154)

Body parser configuration

## Properties

### enabled?

> `optional` **enabled?**: `boolean`

Defined in: [types/server.ts:156](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/server.ts#L156)

Enable body parsing (default: true)

---

### maxSize?

> `optional` **maxSize?**: `string`

Defined in: [types/server.ts:159](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/server.ts#L159)

Maximum body size (default: "10mb")

---

### jsonLimit?

> `optional` **jsonLimit?**: `string`

Defined in: [types/server.ts:162](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/server.ts#L162)

JSON body limit (default: "10mb")

---

### urlEncoded?

> `optional` **urlEncoded?**: `boolean`

Defined in: [types/server.ts:165](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/server.ts#L165)

Enable URL-encoded body parsing
