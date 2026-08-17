[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / EndpointHealth

# Type Alias: EndpointHealth

> **EndpointHealth** = `object`

Defined in: [types/providers.ts:2297](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2297)

Endpoint health and metadata information.

## Properties

### status

> **status**: `"healthy"` \| `"unhealthy"` \| `"unknown"`

Defined in: [types/providers.ts:2298](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2298)

---

### responseTime

> **responseTime**: `number`

Defined in: [types/providers.ts:2299](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2299)

---

### metadata?

> `optional` **metadata?**: `Record`\<`string`, `unknown`\>

Defined in: [types/providers.ts:2300](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2300)

---

### modelInfo?

> `optional` **modelInfo?**: `object`

Defined in: [types/providers.ts:2301](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2301)

#### name?

> `optional` **name?**: `string`

#### version?

> `optional` **version?**: `string`

#### framework?

> `optional` **framework?**: `string`

#### architecture?

> `optional` **architecture?**: `string`
