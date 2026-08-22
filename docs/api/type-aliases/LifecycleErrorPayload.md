[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / LifecycleErrorPayload

# Type Alias: LifecycleErrorPayload

> **LifecycleErrorPayload** = `object`

Defined in: [types/middleware.ts:323](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/middleware.ts#L323)

Payload delivered to onError callbacks when generation or streaming fails.

## Properties

### error

> **error**: `Error`

Defined in: [types/middleware.ts:325](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/middleware.ts#L325)

The error that occurred

---

### duration

> **duration**: `number`

Defined in: [types/middleware.ts:327](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/middleware.ts#L327)

Wall-clock duration until failure in milliseconds

---

### recoverable

> **recoverable**: `boolean`

Defined in: [types/middleware.ts:329](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/middleware.ts#L329)

Whether the error is likely recoverable (rate limit, timeout, network)
