[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / EndpointHealth

# Type Alias: EndpointHealth

> **EndpointHealth** = `object`

Defined in: [types/providers.ts:2425](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2425)

Endpoint health and metadata information.

## Properties

### status

> **status**: `"healthy"` \| `"unhealthy"` \| `"unknown"`

Defined in: [types/providers.ts:2426](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2426)

---

### responseTime

> **responseTime**: `number`

Defined in: [types/providers.ts:2427](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2427)

---

### metadata?

> `optional` **metadata?**: `Record`\<`string`, `unknown`\>

Defined in: [types/providers.ts:2428](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2428)

---

### modelInfo?

> `optional` **modelInfo?**: `object`

Defined in: [types/providers.ts:2429](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2429)

#### name?

> `optional` **name?**: `string`

#### version?

> `optional` **version?**: `string`

#### framework?

> `optional` **framework?**: `string`

#### architecture?

> `optional` **architecture?**: `string`
