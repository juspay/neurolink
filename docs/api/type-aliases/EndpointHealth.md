[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / EndpointHealth

# Type Alias: EndpointHealth

> **EndpointHealth** = `object`

Defined in: [types/providers.ts:2293](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2293)

Endpoint health and metadata information.

## Properties

### status

> **status**: `"healthy"` \| `"unhealthy"` \| `"unknown"`

Defined in: [types/providers.ts:2294](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2294)

---

### responseTime

> **responseTime**: `number`

Defined in: [types/providers.ts:2295](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2295)

---

### metadata?

> `optional` **metadata?**: `Record`\<`string`, `unknown`\>

Defined in: [types/providers.ts:2296](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2296)

---

### modelInfo?

> `optional` **modelInfo?**: `object`

Defined in: [types/providers.ts:2297](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2297)

#### name?

> `optional` **name?**: `string`

#### version?

> `optional` **version?**: `string`

#### framework?

> `optional` **framework?**: `string`

#### architecture?

> `optional` **architecture?**: `string`
