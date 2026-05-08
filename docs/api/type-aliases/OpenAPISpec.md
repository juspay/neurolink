[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / OpenAPISpec

# Type Alias: OpenAPISpec

> **OpenAPISpec** = `object`

Defined in: [types/server.ts:1382](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L1382)

Structured OpenAPI 3.1 specification object.

## Properties

### openapi

> **openapi**: `"3.1.0"`

Defined in: [types/server.ts:1383](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L1383)

---

### info

> **info**: [`JsonObject`](JsonObject.md)

Defined in: [types/server.ts:1384](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L1384)

---

### servers

> **servers**: [`JsonObject`](JsonObject.md)[]

Defined in: [types/server.ts:1385](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L1385)

---

### tags

> **tags**: [`JsonObject`](JsonObject.md)[]

Defined in: [types/server.ts:1386](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L1386)

---

### paths

> **paths**: `Record`\<`string`, [`JsonObject`](JsonObject.md)\>

Defined in: [types/server.ts:1387](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L1387)

---

### components

> **components**: `object`

Defined in: [types/server.ts:1388](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L1388)

#### schemas

> **schemas**: `Record`\<`string`, [`JsonObject`](JsonObject.md)\>

#### securitySchemes?

> `optional` **securitySchemes?**: `Record`\<`string`, [`JsonObject`](JsonObject.md)\>

#### parameters?

> `optional` **parameters?**: `Record`\<`string`, [`JsonObject`](JsonObject.md)\>

---

### security?

> `optional` **security?**: [`JsonObject`](JsonObject.md)[]

Defined in: [types/server.ts:1393](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L1393)
