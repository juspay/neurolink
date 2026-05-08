[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / OpenAPIGeneratorConfig

# Type Alias: OpenAPIGeneratorConfig

> **OpenAPIGeneratorConfig** = `object`

Defined in: [types/server.ts:1361](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L1361)

Configuration passed to the OpenAPI spec generator.

## Properties

### info?

> `optional` **info?**: `object`

Defined in: [types/server.ts:1362](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L1362)

#### title?

> `optional` **title?**: `string`

#### version?

> `optional` **version?**: `string`

#### description?

> `optional` **description?**: `string`

---

### servers?

> `optional` **servers?**: `object`[]

Defined in: [types/server.ts:1367](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L1367)

#### url

> **url**: `string`

#### description?

> `optional` **description?**: `string`

---

### includeSecurity?

> `optional` **includeSecurity?**: `boolean`

Defined in: [types/server.ts:1371](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L1371)

---

### basePath?

> `optional` **basePath?**: `string`

Defined in: [types/server.ts:1372](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L1372)

---

### additionalTags?

> `optional` **additionalTags?**: `object`[]

Defined in: [types/server.ts:1373](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L1373)

#### name

> **name**: `string`

#### description

> **description**: `string`

---

### customSchemas?

> `optional` **customSchemas?**: `Record`\<`string`, [`JsonObject`](JsonObject.md)\>

Defined in: [types/server.ts:1377](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L1377)

---

### routes?

> `optional` **routes?**: [`RouteDefinition`](RouteDefinition.md)[]

Defined in: [types/server.ts:1378](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L1378)
