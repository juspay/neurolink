[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / EndpointHealth

# Type Alias: EndpointHealth

> **EndpointHealth** = `object`

Defined in: [types/providers.ts:2387](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2387)

Endpoint health and metadata information.

## Properties

### status

> **status**: `"healthy"` \| `"unhealthy"` \| `"unknown"`

Defined in: [types/providers.ts:2388](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2388)

---

### responseTime

> **responseTime**: `number`

Defined in: [types/providers.ts:2389](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2389)

---

### metadata?

> `optional` **metadata?**: `Record`\<`string`, `unknown`\>

Defined in: [types/providers.ts:2390](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2390)

---

### modelInfo?

> `optional` **modelInfo?**: `object`

Defined in: [types/providers.ts:2391](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2391)

#### name?

> `optional` **name?**: `string`

#### version?

> `optional` **version?**: `string`

#### framework?

> `optional` **framework?**: `string`

#### architecture?

> `optional` **architecture?**: `string`
