[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / WorkerLogEvent

# Type Alias: WorkerLogEvent

> **WorkerLogEvent** = `object`

Defined in: [types/isolatedAgent.ts:29](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/isolatedAgent.ts#L29)

A log event forwarded by a worker instance's log bridge.

## Properties

### tag

> **tag**: `string`

Defined in: [types/isolatedAgent.ts:31](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/isolatedAgent.ts#L31)

Caller-supplied tag identifying which worker produced the event.

---

### level

> **level**: `string`

Defined in: [types/isolatedAgent.ts:33](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/isolatedAgent.ts#L33)

Log level ("debug" | "info" | "warn" | "error").

---

### message

> **message**: `string`

Defined in: [types/isolatedAgent.ts:35](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/isolatedAgent.ts#L35)

Log message.

---

### timestamp

> **timestamp**: `number`

Defined in: [types/isolatedAgent.ts:37](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/isolatedAgent.ts#L37)

Epoch milliseconds.

---

### data?

> `optional` **data?**: `unknown`

Defined in: [types/isolatedAgent.ts:39](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/isolatedAgent.ts#L39)

Structured payload attached to the log call, if any.
