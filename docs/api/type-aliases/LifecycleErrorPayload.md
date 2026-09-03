[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / LifecycleErrorPayload

# Type Alias: LifecycleErrorPayload

> **LifecycleErrorPayload** = `object`

Defined in: [types/middleware.ts:317](https://github.com/juspay/neurolink/blob/release/src/lib/types/middleware.ts#L317)

Payload delivered to onError callbacks when generation or streaming fails.

## Properties

### error

> **error**: `Error`

Defined in: [types/middleware.ts:319](https://github.com/juspay/neurolink/blob/release/src/lib/types/middleware.ts#L319)

The error that occurred

---

### duration

> **duration**: `number`

Defined in: [types/middleware.ts:321](https://github.com/juspay/neurolink/blob/release/src/lib/types/middleware.ts#L321)

Wall-clock duration until failure in milliseconds

---

### recoverable

> **recoverable**: `boolean`

Defined in: [types/middleware.ts:323](https://github.com/juspay/neurolink/blob/release/src/lib/types/middleware.ts#L323)

Whether the error is likely recoverable (rate limit, timeout, network)
