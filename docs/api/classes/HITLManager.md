[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / HITLManager

# Class: HITLManager

Defined in: [hitl/hitlManager.ts:39](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/hitl/hitlManager.ts#L39)

HITLManager - Central orchestrator for Human-in-the-Loop safety mechanisms

Features:

- Real-time user confirmation via events
- Configurable dangerous action detection
- Custom rule engine for complex scenarios
- Argument modification support
- Comprehensive audit logging
- Timeout handling with cleanup

## Extends

- `EventEmitter`

## Constructors

### Constructor

> **new HITLManager**(`config`): `HITLManager`

Defined in: [hitl/hitlManager.ts:51](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/hitl/hitlManager.ts#L51)

#### Parameters

##### config

[`HITLConfig`](../type-aliases/HITLConfig.md)

#### Returns

`HITLManager`

#### Overrides

`EventEmitter.constructor`

## Methods

### requiresConfirmation()

> **requiresConfirmation**(`toolName`, `args?`): `boolean`

Defined in: [hitl/hitlManager.ts:111](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/hitl/hitlManager.ts#L111)

Check if a tool requires confirmation based on configuration

#### Parameters

##### toolName

`string`

##### args?

`unknown`

#### Returns

`boolean`

---

### requestConfirmation()

> **requestConfirmation**(`toolName`, `arguments_`, `context?`): `Promise`\<[`ConfirmationResult`](../type-aliases/ConfirmationResult.md)\>

Defined in: [hitl/hitlManager.ts:150](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/hitl/hitlManager.ts#L150)

Request confirmation for a tool execution

#### Parameters

##### toolName

`string`

##### arguments\_

`unknown`

##### context?

###### serverId?

`string`

###### sessionId?

`string`

###### userId?

`string`

#### Returns

`Promise`\<[`ConfirmationResult`](../type-aliases/ConfirmationResult.md)\>

---

### processUserResponse()

> **processUserResponse**(`confirmationId`, `response`): `void`

Defined in: [hitl/hitlManager.ts:226](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/hitl/hitlManager.ts#L226)

Process user response to confirmation request

#### Parameters

##### confirmationId

`string`

##### response

###### approved

`boolean`

###### reason?

`string`

###### modifiedArguments?

`unknown`

###### responseTime?

`number`

###### userId?

`string`

#### Returns

`void`

---

### getStatistics()

> **getStatistics**(): [`HITLStatistics`](../type-aliases/HITLStatistics.md)

Defined in: [hitl/hitlManager.ts:519](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/hitl/hitlManager.ts#L519)

Get current HITL usage statistics

#### Returns

[`HITLStatistics`](../type-aliases/HITLStatistics.md)

---

### getConfig()

> **getConfig**(): [`HITLConfig`](../type-aliases/HITLConfig.md)

Defined in: [hitl/hitlManager.ts:526](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/hitl/hitlManager.ts#L526)

Get current configuration

#### Returns

[`HITLConfig`](../type-aliases/HITLConfig.md)

---

### updateConfig()

> **updateConfig**(`newConfig`): `void`

Defined in: [hitl/hitlManager.ts:533](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/hitl/hitlManager.ts#L533)

Update configuration (for dynamic reconfiguration)

#### Parameters

##### newConfig

`Partial`\<[`HITLConfig`](../type-aliases/HITLConfig.md)\>

#### Returns

`void`

---

### cleanup()

> **cleanup**(): `void`

Defined in: [hitl/hitlManager.ts:548](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/hitl/hitlManager.ts#L548)

Clean up resources and reject pending confirmations

#### Returns

`void`

---

### isEnabled()

> **isEnabled**(): `boolean`

Defined in: [hitl/hitlManager.ts:570](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/hitl/hitlManager.ts#L570)

Check if manager is currently enabled

#### Returns

`boolean`

---

### getPendingCount()

> **getPendingCount**(): `number`

Defined in: [hitl/hitlManager.ts:577](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/hitl/hitlManager.ts#L577)

Get count of pending confirmations

#### Returns

`number`
