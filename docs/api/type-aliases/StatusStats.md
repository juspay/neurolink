[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / StatusStats

# Type Alias: StatusStats

> **StatusStats** = `object`

Defined in: [types/proxy.ts:1271](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/proxy.ts#L1271)

Stats shape consumed by the proxy status printer.

## Properties

### totalAttempts?

> `optional` **totalAttempts?**: `number`

Defined in: [types/proxy.ts:1272](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/proxy.ts#L1272)

---

### totalRequests

> **totalRequests**: `number`

Defined in: [types/proxy.ts:1273](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/proxy.ts#L1273)

---

### totalSuccess

> **totalSuccess**: `number`

Defined in: [types/proxy.ts:1274](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/proxy.ts#L1274)

---

### totalErrors

> **totalErrors**: `number`

Defined in: [types/proxy.ts:1275](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/proxy.ts#L1275)

---

### totalRateLimits

> **totalRateLimits**: `number`

Defined in: [types/proxy.ts:1276](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/proxy.ts#L1276)

---

### accounts?

> `optional` **accounts?**: `object`[]

Defined in: [types/proxy.ts:1277](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/proxy.ts#L1277)

#### label

> **label**: `string`

#### type

> **type**: `string`

#### attempts?

> `optional` **attempts?**: `number`

#### requests?

> `optional` **requests?**: `number`

#### success?

> `optional` **success?**: `number`

#### errors?

> `optional` **errors?**: `number`

#### rateLimits?

> `optional` **rateLimits?**: `number`

#### cooling

> **cooling**: `boolean`
