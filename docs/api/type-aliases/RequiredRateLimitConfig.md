[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / RequiredRateLimitConfig

# Type Alias: RequiredRateLimitConfig

> **RequiredRateLimitConfig** = `object`

Defined in: [types/server.ts:142](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L142)

Required rate limit configuration

## Properties

### enabled

> **enabled**: `boolean`

Defined in: [types/server.ts:143](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L143)

---

### windowMs

> **windowMs**: `number`

Defined in: [types/server.ts:144](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L144)

---

### maxRequests

> **maxRequests**: `number`

Defined in: [types/server.ts:145](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L145)

---

### message

> **message**: `string`

Defined in: [types/server.ts:146](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L146)

---

### skipPaths?

> `optional` **skipPaths?**: `string`[]

Defined in: [types/server.ts:147](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L147)

---

### keyGenerator?

> `optional` **keyGenerator?**: (`ctx`) => `string`

Defined in: [types/server.ts:148](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L148)

#### Parameters

##### ctx

[`ServerContext`](ServerContext.md)

#### Returns

`string`
