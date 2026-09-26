[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / Logger

# Type Alias: Logger

> **Logger** = `object`

Logger interface matching the logger object shape
Used for SDK tool contexts and other components that need a logger

## Properties

### debug

> **debug**: (...`args`) => `void`

#### Parameters

##### args

...`unknown`[]

#### Returns

`void`

---

### info

> **info**: (...`args`) => `void`

#### Parameters

##### args

...`unknown`[]

#### Returns

`void`

---

### warn

> **warn**: (...`args`) => `void`

#### Parameters

##### args

...`unknown`[]

#### Returns

`void`

---

### error

> **error**: (...`args`) => `void`

#### Parameters

##### args

...`unknown`[]

#### Returns

`void`

---

### always

> **always**: (...`args`) => `void`

#### Parameters

##### args

...`unknown`[]

#### Returns

`void`

---

### table

> **table**: (`data`) => `void`

#### Parameters

##### data

`unknown`

#### Returns

`void`

---

### setLogLevel

> **setLogLevel**: (`level`) => `void`

#### Parameters

##### level

[`LogLevel`](LogLevel.md)

#### Returns

`void`

---

### getLogs

> **getLogs**: (`level?`) => [`LogEntry`](LogEntry.md)[]

#### Parameters

##### level?

[`LogLevel`](LogLevel.md)

#### Returns

[`LogEntry`](LogEntry.md)[]

---

### clearLogs

> **clearLogs**: () => `void`

#### Returns

`void`

---

### setEventEmitter

> **setEventEmitter**: (`emitter`) => `void`

#### Parameters

##### emitter

###### emit

(`event`, ...`args`) => `boolean`

#### Returns

`void`

---

### clearEventEmitter

> **clearEventEmitter**: () => `void`

#### Returns

`void`
