[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / LogEntry

# Type Alias: LogEntry

> **LogEntry** = `object`

Defined in: [types/utilities.ts:66](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/utilities.ts#L66)

Represents a single log entry in the logging system.
Each entry contains metadata about the log event along with the actual message.

## Properties

### level

> **level**: [`LogLevel`](LogLevel.md)

Defined in: [types/utilities.ts:68](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/utilities.ts#L68)

The severity level of the log entry

---

### message

> **message**: `string`

Defined in: [types/utilities.ts:70](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/utilities.ts#L70)

The text message to be logged

---

### timestamp

> **timestamp**: `Date`

Defined in: [types/utilities.ts:72](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/utilities.ts#L72)

When the log entry was created

---

### data?

> `optional` **data?**: `unknown`

Defined in: [types/utilities.ts:74](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/utilities.ts#L74)

Optional additional data associated with the log entry (objects, arrays, etc.)
