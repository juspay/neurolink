[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / LogEntry

# Type Alias: LogEntry

> **LogEntry** = `object`

Defined in: [types/utilities.ts:66](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/utilities.ts#L66)

Represents a single log entry in the logging system.
Each entry contains metadata about the log event along with the actual message.

## Properties

### level

> **level**: [`LogLevel`](LogLevel.md)

Defined in: [types/utilities.ts:68](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/utilities.ts#L68)

The severity level of the log entry

---

### message

> **message**: `string`

Defined in: [types/utilities.ts:70](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/utilities.ts#L70)

The text message to be logged

---

### timestamp

> **timestamp**: `Date`

Defined in: [types/utilities.ts:72](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/utilities.ts#L72)

When the log entry was created

---

### data?

> `optional` **data?**: `unknown`

Defined in: [types/utilities.ts:74](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/utilities.ts#L74)

Optional additional data associated with the log entry (objects, arrays, etc.)
