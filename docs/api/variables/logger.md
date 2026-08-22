[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / logger

# Variable: logger

> `const` **logger**: `object`

Defined in: [utils/logger.ts:495](https://github.com/juspay/neurolink/blob/release/src/lib/utils/logger.ts#L495)

Main unified logger export that provides a simplified API for logging.
This is the primary interface that should be used by application code.

Features:

- Convenient logging methods (debug, info, warn, error)
- Unconditional logging (always, table)
- Log level control and configuration
- Log history management
- Event emission for all log operations (when emitter is configured)

## Type Declaration

### debug

> **debug**: (...`args`) => `void`

#### Parameters

##### args

...`unknown`[]

#### Returns

`void`

### info

> **info**: (...`args`) => `void`

#### Parameters

##### args

...`unknown`[]

#### Returns

`void`

### warn

> **warn**: (...`args`) => `void`

#### Parameters

##### args

...`unknown`[]

#### Returns

`void`

### error

> **error**: (...`args`) => `void`

#### Parameters

##### args

...`unknown`[]

#### Returns

`void`

### always

> **always**: (...`args`) => `void`

#### Parameters

##### args

...`unknown`[]

#### Returns

`void`

### alwaysStderr

> **alwaysStderr**: (...`args`) => `void`

#### Parameters

##### args

...`unknown`[]

#### Returns

`void`

### table

> **table**: (`data`) => `void`

#### Parameters

##### data

`unknown`

#### Returns

`void`

### shouldLog

> **shouldLog**: (`level`) => `boolean`

#### Parameters

##### level

[`LogLevel`](../type-aliases/LogLevel.md)

#### Returns

`boolean`

### setLogLevel

> **setLogLevel**: (`level`) => `void`

#### Parameters

##### level

[`LogLevel`](../type-aliases/LogLevel.md)

#### Returns

`void`

### getLogs

> **getLogs**: (`level?`) => [`LogEntry`](../type-aliases/LogEntry.md)[]

#### Parameters

##### level?

[`LogLevel`](../type-aliases/LogLevel.md)

#### Returns

[`LogEntry`](../type-aliases/LogEntry.md)[]

### clearLogs

> **clearLogs**: () => `void`

#### Returns

`void`

### setEventEmitter

> **setEventEmitter**: (`emitter`) => `void`

#### Parameters

##### emitter

###### emit

(`event`, ...`args`) => `boolean`

#### Returns

`void`

### clearEventEmitter

> **clearEventEmitter**: (`ifEmitter?`) => `void`

#### Parameters

##### ifEmitter?

###### emit

(`event`, ...`args`) => `boolean`

#### Returns

`void`
