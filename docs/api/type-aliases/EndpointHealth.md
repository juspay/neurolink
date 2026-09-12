[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / EndpointHealth

# Type Alias: EndpointHealth

> **EndpointHealth** = `object`

Defined in: [types/providers.ts:2265](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2265)

Endpoint health and metadata information.

## Properties

### status

> **status**: `"healthy"` \| `"unhealthy"` \| `"unknown"`

Defined in: [types/providers.ts:2266](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2266)

---

### responseTime

> **responseTime**: `number`

Defined in: [types/providers.ts:2267](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2267)

---

### metadata?

> `optional` **metadata?**: `Record`\<`string`, `unknown`\>

Defined in: [types/providers.ts:2268](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2268)

---

### modelInfo?

> `optional` **modelInfo?**: `object`

Defined in: [types/providers.ts:2269](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2269)

#### name?

> `optional` **name?**: `string`

#### version?

> `optional` **version?**: `string`

#### framework?

> `optional` **framework?**: `string`

#### architecture?

> `optional` **architecture?**: `string`
