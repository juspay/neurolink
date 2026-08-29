[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / EndpointHealth

# Type Alias: EndpointHealth

> **EndpointHealth** = `object`

Defined in: [types/providers.ts:2272](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2272)

Endpoint health and metadata information.

## Properties

### status

> **status**: `"healthy"` \| `"unhealthy"` \| `"unknown"`

Defined in: [types/providers.ts:2273](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2273)

---

### responseTime

> **responseTime**: `number`

Defined in: [types/providers.ts:2274](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2274)

---

### metadata?

> `optional` **metadata?**: `Record`\<`string`, `unknown`\>

Defined in: [types/providers.ts:2275](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2275)

---

### modelInfo?

> `optional` **modelInfo?**: `object`

Defined in: [types/providers.ts:2276](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2276)

#### name?

> `optional` **name?**: `string`

#### version?

> `optional` **version?**: `string`

#### framework?

> `optional` **framework?**: `string`

#### architecture?

> `optional` **architecture?**: `string`
