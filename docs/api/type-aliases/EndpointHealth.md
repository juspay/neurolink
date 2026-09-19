[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / EndpointHealth

# Type Alias: EndpointHealth

> **EndpointHealth** = `object`

Defined in: [types/providers.ts:2354](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2354)

Endpoint health and metadata information.

## Properties

### status

> **status**: `"healthy"` \| `"unhealthy"` \| `"unknown"`

Defined in: [types/providers.ts:2355](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2355)

---

### responseTime

> **responseTime**: `number`

Defined in: [types/providers.ts:2356](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2356)

---

### metadata?

> `optional` **metadata?**: `Record`\<`string`, `unknown`\>

Defined in: [types/providers.ts:2357](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2357)

---

### modelInfo?

> `optional` **modelInfo?**: `object`

Defined in: [types/providers.ts:2358](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2358)

#### name?

> `optional` **name?**: `string`

#### version?

> `optional` **version?**: `string`

#### framework?

> `optional` **framework?**: `string`

#### architecture?

> `optional` **architecture?**: `string`
