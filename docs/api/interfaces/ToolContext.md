[**NeuroLink API Reference v8.26.1**](../README.md)

---

[NeuroLink API Reference](../globals.md) / ToolContext

# Interface: ToolContext

Defined in: [sdk/toolRegistration.ts:105](https://github.com/juspay/neurolink/blob/997832c0dc437abf3a045a6ab43aafda5c330f4e/src/lib/sdk/toolRegistration.ts#L105)

Context provided to tools during execution
Extends the core ToolContext with SDK-specific features

## Extends

- `ToolContext`

## Properties

### sessionId

> **sessionId**: `string`

Defined in: [sdk/toolRegistration.ts:109](https://github.com/juspay/neurolink/blob/997832c0dc437abf3a045a6ab43aafda5c330f4e/src/lib/sdk/toolRegistration.ts#L109)

Current session ID

#### Overrides

`CoreToolContext.sessionId`

---

### provider?

> `optional` **provider**: `string`

Defined in: [sdk/toolRegistration.ts:114](https://github.com/juspay/neurolink/blob/997832c0dc437abf3a045a6ab43aafda5c330f4e/src/lib/sdk/toolRegistration.ts#L114)

AI provider being used

---

### model?

> `optional` **model**: `string`

Defined in: [sdk/toolRegistration.ts:119](https://github.com/juspay/neurolink/blob/997832c0dc437abf3a045a6ab43aafda5c330f4e/src/lib/sdk/toolRegistration.ts#L119)

Model being used

---

### callTool()?

> `optional` **callTool**: (`name`, `params`) => `Promise`\<[`ToolResult`](../type-aliases/ToolResult.md)\>

Defined in: [sdk/toolRegistration.ts:124](https://github.com/juspay/neurolink/blob/997832c0dc437abf3a045a6ab43aafda5c330f4e/src/lib/sdk/toolRegistration.ts#L124)

Call another tool

#### Parameters

##### name

`string`

##### params

`ToolArgs`

#### Returns

`Promise`\<[`ToolResult`](../type-aliases/ToolResult.md)\>

---

### logger

> **logger**: `object`

Defined in: [sdk/toolRegistration.ts:129](https://github.com/juspay/neurolink/blob/997832c0dc437abf3a045a6ab43aafda5c330f4e/src/lib/sdk/toolRegistration.ts#L129)

Logger instance

#### debug()

> **debug**: (...`args`) => `void`

##### Parameters

###### args

...`unknown`[]

##### Returns

`void`

#### info()

> **info**: (...`args`) => `void`

##### Parameters

###### args

...`unknown`[]

##### Returns

`void`

#### warn()

> **warn**: (...`args`) => `void`

##### Parameters

###### args

...`unknown`[]

##### Returns

`void`

#### error()

> **error**: (...`args`) => `void`

##### Parameters

###### args

...`unknown`[]

##### Returns

`void`

#### always()

> **always**: (...`args`) => `void`

##### Parameters

###### args

...`unknown`[]

##### Returns

`void`

#### table()

> **table**: (`data`) => `void`

##### Parameters

###### data

`unknown`

##### Returns

`void`

#### setLogLevel()

> **setLogLevel**: (`level`) => `void`

##### Parameters

###### level

[`LogLevel`](../type-aliases/LogLevel.md)

##### Returns

`void`

#### getLogs()

> **getLogs**: (`level?`) => `LogEntry`[]

##### Parameters

###### level?

[`LogLevel`](../type-aliases/LogLevel.md)

##### Returns

`LogEntry`[]

#### clearLogs()

> **clearLogs**: () => `void`

##### Returns

`void`

#### setEventEmitter()

> **setEventEmitter**: (`emitter`) => `void`

##### Parameters

###### emitter

###### emit

(`event`, ...`args`) => `boolean`

##### Returns

`void`

#### clearEventEmitter()

> **clearEventEmitter**: () => `void`

##### Returns

`void`

---

### userId?

> `optional` **userId**: `string`

Defined in: [types/tools.ts:179](https://github.com/juspay/neurolink/blob/997832c0dc437abf3a045a6ab43aafda5c330f4e/src/lib/types/tools.ts#L179)

#### Inherited from

`CoreToolContext.userId`

---

### aiProvider?

> `optional` **aiProvider**: `string`

Defined in: [types/tools.ts:180](https://github.com/juspay/neurolink/blob/997832c0dc437abf3a045a6ab43aafda5c330f4e/src/lib/types/tools.ts#L180)

#### Inherited from

`CoreToolContext.aiProvider`

---

### metadata?

> `optional` **metadata**: `ToolExecutionMetadata`

Defined in: [types/tools.ts:181](https://github.com/juspay/neurolink/blob/997832c0dc437abf3a045a6ab43aafda5c330f4e/src/lib/types/tools.ts#L181)

#### Inherited from

`CoreToolContext.metadata`
