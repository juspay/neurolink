[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / EndpointHealth

# Type Alias: EndpointHealth

> **EndpointHealth** = `object`

Defined in: [types/providers.ts:2361](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2361)

Endpoint health and metadata information.

## Properties

### status

> **status**: `"healthy"` \| `"unhealthy"` \| `"unknown"`

Defined in: [types/providers.ts:2362](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2362)

---

### responseTime

> **responseTime**: `number`

Defined in: [types/providers.ts:2363](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2363)

---

### metadata?

> `optional` **metadata?**: `Record`\<`string`, `unknown`\>

Defined in: [types/providers.ts:2364](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2364)

---

### modelInfo?

> `optional` **modelInfo?**: `object`

Defined in: [types/providers.ts:2365](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2365)

#### name?

> `optional` **name?**: `string`

#### version?

> `optional` **version?**: `string`

#### framework?

> `optional` **framework?**: `string`

#### architecture?

> `optional` **architecture?**: `string`
