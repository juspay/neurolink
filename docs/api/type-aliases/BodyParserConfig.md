[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / BodyParserConfig

# Type Alias: BodyParserConfig

> **BodyParserConfig** = `object`

Defined in: [types/server.ts:154](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L154)

Body parser configuration

## Properties

### enabled?

> `optional` **enabled?**: `boolean`

Defined in: [types/server.ts:156](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L156)

Enable body parsing (default: true)

---

### maxSize?

> `optional` **maxSize?**: `string`

Defined in: [types/server.ts:159](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L159)

Maximum body size (default: "10mb")

---

### jsonLimit?

> `optional` **jsonLimit?**: `string`

Defined in: [types/server.ts:162](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L162)

JSON body limit (default: "10mb")

---

### urlEncoded?

> `optional` **urlEncoded?**: `boolean`

Defined in: [types/server.ts:165](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L165)

Enable URL-encoded body parsing
