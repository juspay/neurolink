[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / LifecycleErrorPayload

# Type Alias: LifecycleErrorPayload

> **LifecycleErrorPayload** = `object`

Defined in: [types/middleware.ts:323](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/middleware.ts#L323)

Payload delivered to onError callbacks when generation or streaming fails.

## Properties

### error

> **error**: `Error`

Defined in: [types/middleware.ts:325](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/middleware.ts#L325)

The error that occurred

---

### duration

> **duration**: `number`

Defined in: [types/middleware.ts:327](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/middleware.ts#L327)

Wall-clock duration until failure in milliseconds

---

### recoverable

> **recoverable**: `boolean`

Defined in: [types/middleware.ts:329](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/middleware.ts#L329)

Whether the error is likely recoverable (rate limit, timeout, network)
