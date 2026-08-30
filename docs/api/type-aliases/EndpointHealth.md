[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / EndpointHealth

# Type Alias: EndpointHealth

> **EndpointHealth** = `object`

Defined in: [types/providers.ts:2275](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2275)

Endpoint health and metadata information.

## Properties

### status

> **status**: `"healthy"` \| `"unhealthy"` \| `"unknown"`

Defined in: [types/providers.ts:2276](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2276)

---

### responseTime

> **responseTime**: `number`

Defined in: [types/providers.ts:2277](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2277)

---

### metadata?

> `optional` **metadata?**: `Record`\<`string`, `unknown`\>

Defined in: [types/providers.ts:2278](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2278)

---

### modelInfo?

> `optional` **modelInfo?**: `object`

Defined in: [types/providers.ts:2279](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2279)

#### name?

> `optional` **name?**: `string`

#### version?

> `optional` **version?**: `string`

#### framework?

> `optional` **framework?**: `string`

#### architecture?

> `optional` **architecture?**: `string`
