[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / Logger

# Type Alias: Logger

> **Logger** = `object`

Defined in: [types/utilities.ts:97](https://github.com/juspay/neurolink/blob/release/src/lib/types/utilities.ts#L97)

Logger interface matching the logger object shape
Used for SDK tool contexts and other components that need a logger

Deliberately a subset of the real logger: the per-instance routing methods
(`runInInstanceScope`, `addScopedEventEmitter`, …) are internal plumbing
between the SDK entry points and the logger, and this type is a structural
contract a caller can satisfy — `SDKToolContext.logger`. Adding required
members here would break anyone constructing that context themselves.

## Properties

### debug

> **debug**: (...`args`) => `void`

Defined in: [types/utilities.ts:98](https://github.com/juspay/neurolink/blob/release/src/lib/types/utilities.ts#L98)

#### Parameters

##### args

...`unknown`[]

#### Returns

`void`

---

### info

> **info**: (...`args`) => `void`

Defined in: [types/utilities.ts:99](https://github.com/juspay/neurolink/blob/release/src/lib/types/utilities.ts#L99)

#### Parameters

##### args

...`unknown`[]

#### Returns

`void`

---

### warn

> **warn**: (...`args`) => `void`

Defined in: [types/utilities.ts:100](https://github.com/juspay/neurolink/blob/release/src/lib/types/utilities.ts#L100)

#### Parameters

##### args

...`unknown`[]

#### Returns

`void`

---

### error

> **error**: (...`args`) => `void`

Defined in: [types/utilities.ts:101](https://github.com/juspay/neurolink/blob/release/src/lib/types/utilities.ts#L101)

#### Parameters

##### args

...`unknown`[]

#### Returns

`void`

---

### always

> **always**: (...`args`) => `void`

Defined in: [types/utilities.ts:102](https://github.com/juspay/neurolink/blob/release/src/lib/types/utilities.ts#L102)

#### Parameters

##### args

...`unknown`[]

#### Returns

`void`

---

### table

> **table**: (`data`) => `void`

Defined in: [types/utilities.ts:103](https://github.com/juspay/neurolink/blob/release/src/lib/types/utilities.ts#L103)

#### Parameters

##### data

`unknown`

#### Returns

`void`

---

### setLogLevel

> **setLogLevel**: (`level`) => `void`

Defined in: [types/utilities.ts:104](https://github.com/juspay/neurolink/blob/release/src/lib/types/utilities.ts#L104)

#### Parameters

##### level

[`LogLevel`](LogLevel.md)

#### Returns

`void`

---

### getLogs

> **getLogs**: (`level?`) => [`LogEntry`](LogEntry.md)[]

Defined in: [types/utilities.ts:105](https://github.com/juspay/neurolink/blob/release/src/lib/types/utilities.ts#L105)

#### Parameters

##### level?

[`LogLevel`](LogLevel.md)

#### Returns

[`LogEntry`](LogEntry.md)[]

---

### clearLogs

> **clearLogs**: () => `void`

Defined in: [types/utilities.ts:106](https://github.com/juspay/neurolink/blob/release/src/lib/types/utilities.ts#L106)

#### Returns

`void`

---

### setEventEmitter

> **setEventEmitter**: (`emitter`) => `void`

Defined in: [types/utilities.ts:107](https://github.com/juspay/neurolink/blob/release/src/lib/types/utilities.ts#L107)

#### Parameters

##### emitter

[`LogEventEmitter`](LogEventEmitter.md)

#### Returns

`void`

---

### clearEventEmitter

> **clearEventEmitter**: () => `void`

Defined in: [types/utilities.ts:108](https://github.com/juspay/neurolink/blob/release/src/lib/types/utilities.ts#L108)

#### Returns

`void`
