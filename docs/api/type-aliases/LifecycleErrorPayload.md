[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / LifecycleErrorPayload

# Type Alias: LifecycleErrorPayload

> **LifecycleErrorPayload** = `object`

Payload delivered to onError callbacks when generation or streaming fails.

## Properties

### error

> **error**: `Error`

The error that occurred

---

### duration

> **duration**: `number`

Wall-clock duration until failure in milliseconds

---

### recoverable

> **recoverable**: `boolean`

Whether the error is likely recoverable (rate limit, timeout, network)
