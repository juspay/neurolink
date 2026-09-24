[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / EndpointHealth

# Type Alias: EndpointHealth

> **EndpointHealth** = `object`

Defined in: [types/providers.ts:2378](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2378)

Endpoint health and metadata information.

## Properties

### status

> **status**: `"healthy"` \| `"unhealthy"` \| `"unknown"`

Defined in: [types/providers.ts:2379](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2379)

---

### responseTime

> **responseTime**: `number`

Defined in: [types/providers.ts:2380](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2380)

---

### metadata?

> `optional` **metadata?**: `Record`\<`string`, `unknown`\>

Defined in: [types/providers.ts:2381](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2381)

---

### modelInfo?

> `optional` **modelInfo?**: `object`

Defined in: [types/providers.ts:2382](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2382)

#### name?

> `optional` **name?**: `string`

#### version?

> `optional` **version?**: `string`

#### framework?

> `optional` **framework?**: `string`

#### architecture?

> `optional` **architecture?**: `string`
