[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / OpenAPISpec

# Type Alias: OpenAPISpec

> **OpenAPISpec** = `object`

Defined in: [types/server.ts:1391](https://github.com/juspay/neurolink/blob/release/src/lib/types/server.ts#L1391)

Structured OpenAPI 3.1 specification object.

## Properties

### openapi

> **openapi**: `"3.1.0"`

Defined in: [types/server.ts:1392](https://github.com/juspay/neurolink/blob/release/src/lib/types/server.ts#L1392)

---

### info

> **info**: [`JsonObject`](JsonObject.md)

Defined in: [types/server.ts:1393](https://github.com/juspay/neurolink/blob/release/src/lib/types/server.ts#L1393)

---

### servers

> **servers**: [`JsonObject`](JsonObject.md)[]

Defined in: [types/server.ts:1394](https://github.com/juspay/neurolink/blob/release/src/lib/types/server.ts#L1394)

---

### tags

> **tags**: [`JsonObject`](JsonObject.md)[]

Defined in: [types/server.ts:1395](https://github.com/juspay/neurolink/blob/release/src/lib/types/server.ts#L1395)

---

### paths

> **paths**: `Record`\<`string`, [`JsonObject`](JsonObject.md)\>

Defined in: [types/server.ts:1396](https://github.com/juspay/neurolink/blob/release/src/lib/types/server.ts#L1396)

---

### components

> **components**: `object`

Defined in: [types/server.ts:1397](https://github.com/juspay/neurolink/blob/release/src/lib/types/server.ts#L1397)

#### schemas

> **schemas**: `Record`\<`string`, [`JsonObject`](JsonObject.md)\>

#### securitySchemes?

> `optional` **securitySchemes?**: `Record`\<`string`, [`JsonObject`](JsonObject.md)\>

#### parameters?

> `optional` **parameters?**: `Record`\<`string`, [`JsonObject`](JsonObject.md)\>

---

### security?

> `optional` **security?**: [`JsonObject`](JsonObject.md)[]

Defined in: [types/server.ts:1402](https://github.com/juspay/neurolink/blob/release/src/lib/types/server.ts#L1402)
