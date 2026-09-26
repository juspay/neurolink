[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / WorkerLogEvent

# Type Alias: WorkerLogEvent

> **WorkerLogEvent** = `object`

A log event forwarded by a worker instance's log bridge.

## Properties

### tag

> **tag**: `string`

Caller-supplied tag identifying which worker produced the event.

---

### level

> **level**: `string`

Log level ("debug" | "info" | "warn" | "error").

---

### message

> **message**: `string`

Log message.

---

### timestamp

> **timestamp**: `number`

Epoch milliseconds.

---

### data?

> `optional` **data?**: `unknown`

Structured payload attached to the log call, if any.
