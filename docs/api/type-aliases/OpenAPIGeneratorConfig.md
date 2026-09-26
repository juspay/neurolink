[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / OpenAPIGeneratorConfig

# Type Alias: OpenAPIGeneratorConfig

> **OpenAPIGeneratorConfig** = `object`

Defined in: [types/server.ts:1370](https://github.com/juspay/neurolink/blob/release/src/lib/types/server.ts#L1370)

Configuration passed to the OpenAPI spec generator.

## Properties

### info?

> `optional` **info?**: `object`

Defined in: [types/server.ts:1371](https://github.com/juspay/neurolink/blob/release/src/lib/types/server.ts#L1371)

#### title?

> `optional` **title?**: `string`

#### version?

> `optional` **version?**: `string`

#### description?

> `optional` **description?**: `string`

---

### servers?

> `optional` **servers?**: `object`[]

Defined in: [types/server.ts:1376](https://github.com/juspay/neurolink/blob/release/src/lib/types/server.ts#L1376)

#### url

> **url**: `string`

#### description?

> `optional` **description?**: `string`

---

### includeSecurity?

> `optional` **includeSecurity?**: `boolean`

Defined in: [types/server.ts:1380](https://github.com/juspay/neurolink/blob/release/src/lib/types/server.ts#L1380)

---

### basePath?

> `optional` **basePath?**: `string`

Defined in: [types/server.ts:1381](https://github.com/juspay/neurolink/blob/release/src/lib/types/server.ts#L1381)

---

### additionalTags?

> `optional` **additionalTags?**: `object`[]

Defined in: [types/server.ts:1382](https://github.com/juspay/neurolink/blob/release/src/lib/types/server.ts#L1382)

#### name

> **name**: `string`

#### description

> **description**: `string`

---

### customSchemas?

> `optional` **customSchemas?**: `Record`\<`string`, [`JsonObject`](JsonObject.md)\>

Defined in: [types/server.ts:1386](https://github.com/juspay/neurolink/blob/release/src/lib/types/server.ts#L1386)

---

### routes?

> `optional` **routes?**: [`RouteDefinition`](RouteDefinition.md)[]

Defined in: [types/server.ts:1387](https://github.com/juspay/neurolink/blob/release/src/lib/types/server.ts#L1387)
