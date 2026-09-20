[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / EndpointHealth

# Type Alias: EndpointHealth

> **EndpointHealth** = `object`

Defined in: [types/providers.ts:2353](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2353)

Endpoint health and metadata information.

## Properties

### status

> **status**: `"healthy"` \| `"unhealthy"` \| `"unknown"`

Defined in: [types/providers.ts:2354](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2354)

---

### responseTime

> **responseTime**: `number`

Defined in: [types/providers.ts:2355](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2355)

---

### metadata?

> `optional` **metadata?**: `Record`\<`string`, `unknown`\>

Defined in: [types/providers.ts:2356](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2356)

---

### modelInfo?

> `optional` **modelInfo?**: `object`

Defined in: [types/providers.ts:2357](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2357)

#### name?

> `optional` **name?**: `string`

#### version?

> `optional` **version?**: `string`

#### framework?

> `optional` **framework?**: `string`

#### architecture?

> `optional` **architecture?**: `string`
