[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / EndpointHealth

# Type Alias: EndpointHealth

> **EndpointHealth** = `object`

Defined in: [types/providers.ts:2240](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2240)

Endpoint health and metadata information.

## Properties

### status

> **status**: `"healthy"` \| `"unhealthy"` \| `"unknown"`

Defined in: [types/providers.ts:2241](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2241)

---

### responseTime

> **responseTime**: `number`

Defined in: [types/providers.ts:2242](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2242)

---

### metadata?

> `optional` **metadata?**: `Record`\<`string`, `unknown`\>

Defined in: [types/providers.ts:2243](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2243)

---

### modelInfo?

> `optional` **modelInfo?**: `object`

Defined in: [types/providers.ts:2244](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2244)

#### name?

> `optional` **name?**: `string`

#### version?

> `optional` **version?**: `string`

#### framework?

> `optional` **framework?**: `string`

#### architecture?

> `optional` **architecture?**: `string`
