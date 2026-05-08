[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / RouteDefinition

# Type Alias: RouteDefinition

> **RouteDefinition** = `object`

Defined in: [types/server.ts:395](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L395)

Route definition

## Properties

### method

> **method**: [`HttpMethod`](HttpMethod.md)

Defined in: [types/server.ts:397](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L397)

HTTP method

---

### path

> **path**: `string`

Defined in: [types/server.ts:400](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L400)

Route path (supports parameters like :id)

---

### handler

> **handler**: [`RouteHandler`](RouteHandler.md)

Defined in: [types/server.ts:403](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L403)

Route handler function

---

### description?

> `optional` **description?**: `string`

Defined in: [types/server.ts:406](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L406)

Route description (for documentation)

---

### requestSchema?

> `optional` **requestSchema?**: [`JsonObject`](JsonObject.md)

Defined in: [types/server.ts:409](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L409)

Request schema (for validation)

---

### responseSchema?

> `optional` **responseSchema?**: [`JsonObject`](JsonObject.md)

Defined in: [types/server.ts:412](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L412)

Response schema (for documentation)

---

### auth?

> `optional` **auth?**: `boolean`

Defined in: [types/server.ts:415](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L415)

Authentication required

---

### roles?

> `optional` **roles?**: `string`[]

Defined in: [types/server.ts:418](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L418)

Required roles

---

### rateLimit?

> `optional` **rateLimit?**: [`RateLimitConfig`](RateLimitConfig.md)

Defined in: [types/server.ts:421](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L421)

Rate limit override for this route

---

### streaming?

> `optional` **streaming?**: [`StreamingConfig`](StreamingConfig.md)

Defined in: [types/server.ts:424](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L424)

Streaming configuration

---

### tags?

> `optional` **tags?**: `string`[]

Defined in: [types/server.ts:427](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L427)

Route tags (for documentation)

---

### deprecated?

> `optional` **deprecated?**: [`RouteDeprecation`](RouteDeprecation.md)

Defined in: [types/server.ts:430](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L430)

Route deprecation information
