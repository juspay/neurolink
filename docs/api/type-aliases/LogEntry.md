[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / LogEntry

# Type Alias: LogEntry

> **LogEntry** = `object`

Represents a single log entry in the logging system.
Each entry contains metadata about the log event along with the actual message.

## Properties

### level

> **level**: [`LogLevel`](LogLevel.md)

The severity level of the log entry

---

### message

> **message**: `string`

The text message to be logged

---

### timestamp

> **timestamp**: `Date`

When the log entry was created

---

### data?

> `optional` **data?**: `unknown`

Optional additional data associated with the log entry (objects, arrays, etc.)
