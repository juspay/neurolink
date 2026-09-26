[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / HITLManager

# Class: HITLManager

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

Get current HITL usage statistics

#### Returns

[`HITLStatistics`](../type-aliases/HITLStatistics.md)

---

### getConfig()

> **getConfig**(): [`HITLConfig`](../type-aliases/HITLConfig.md)

Get current configuration

#### Returns

[`HITLConfig`](../type-aliases/HITLConfig.md)

---

### updateConfig()

> **updateConfig**(`newConfig`): `void`

Update configuration (for dynamic reconfiguration)

#### Parameters

##### newConfig

`Partial`\<[`HITLConfig`](../type-aliases/HITLConfig.md)\>

#### Returns

`void`

---

### cleanup()

> **cleanup**(): `void`

Clean up resources and reject pending confirmations

#### Returns

`void`

---

### isEnabled()

> **isEnabled**(): `boolean`

Check if manager is currently enabled

#### Returns

`boolean`

---

### getPendingCount()

> **getPendingCount**(): `number`

Get count of pending confirmations

#### Returns

`number`

---

### hasPendingConfirmation()

> **hasPendingConfirmation**(`confirmationId`): `boolean`

Whether a specific confirmation is still awaiting a response on this manager.

A pending entry holds the `resolve`/`reject` of the suspended tool call, so it
exists only in the memory of the manager that issued it. A manager constructed
after the confirmation was issued — a session rebuilt from persisted state, for
example — has an empty set, and `processUserResponse` for such an id logs a
warning and returns without resolving anything.

Callers that report an outcome back to a user should check this before treating
a delivered `hitl:confirmation-response` as acted upon: the event being received
says a listener existed, not that anything was waiting for it.

#### Parameters

##### confirmationId

`string`

#### Returns

`boolean`
