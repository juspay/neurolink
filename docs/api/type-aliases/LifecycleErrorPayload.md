[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / LifecycleErrorPayload

# Type Alias: LifecycleErrorPayload

> **LifecycleErrorPayload** = `object`

Defined in: [types/middleware.ts:293](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/middleware.ts#L293)

Payload delivered to onError callbacks when generation or streaming fails.

## Properties

### error

> **error**: `Error`

Defined in: [types/middleware.ts:295](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/middleware.ts#L295)

The error that occurred

---

### duration

> **duration**: `number`

Defined in: [types/middleware.ts:297](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/middleware.ts#L297)

Wall-clock duration until failure in milliseconds

---

### recoverable

> **recoverable**: `boolean`

Defined in: [types/middleware.ts:299](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/middleware.ts#L299)

Whether the error is likely recoverable (rate limit, timeout, network)
