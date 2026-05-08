[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / HITLManager

# Type Alias: HITLManager

> **HITLManager** = `object`

Defined in: [types/hitl.ts:268](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/hitl.ts#L268)

HITLManager type
Defines the public contract for HITL manager implementations.
Used for type annotations when referencing HITLManager instances.

## Methods

### isEnabled()

> **isEnabled**(): `boolean`

Defined in: [types/hitl.ts:270](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/hitl.ts#L270)

Check if HITL is currently enabled

#### Returns

`boolean`

---

### requiresConfirmation()

> **requiresConfirmation**(`toolName`, `args?`): `boolean`

Defined in: [types/hitl.ts:273](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/hitl.ts#L273)

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

> **requestConfirmation**(`toolName`, `arguments_`, `context?`): `Promise`\<[`ConfirmationResult`](ConfirmationResult.md)\>

Defined in: [types/hitl.ts:276](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/hitl.ts#L276)

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

`Promise`\<[`ConfirmationResult`](ConfirmationResult.md)\>

---

### processUserResponse()

> **processUserResponse**(`confirmationId`, `response`): `void`

Defined in: [types/hitl.ts:287](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/hitl.ts#L287)

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

> **getStatistics**(): [`HITLStatistics`](HITLStatistics.md)

Defined in: [types/hitl.ts:299](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/hitl.ts#L299)

Get current HITL usage statistics

#### Returns

[`HITLStatistics`](HITLStatistics.md)

---

### getConfig()

> **getConfig**(): [`HITLConfig`](HITLConfig.md)

Defined in: [types/hitl.ts:302](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/hitl.ts#L302)

Get current configuration

#### Returns

[`HITLConfig`](HITLConfig.md)

---

### updateConfig()

> **updateConfig**(`newConfig`): `void`

Defined in: [types/hitl.ts:305](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/hitl.ts#L305)

Update configuration dynamically

#### Parameters

##### newConfig

`Partial`\<[`HITLConfig`](HITLConfig.md)\>

#### Returns

`void`

---

### cleanup()

> **cleanup**(): `void`

Defined in: [types/hitl.ts:308](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/hitl.ts#L308)

Clean up resources and reject pending confirmations

#### Returns

`void`

---

### getPendingCount()

> **getPendingCount**(): `number`

Defined in: [types/hitl.ts:311](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/hitl.ts#L311)

Get count of pending confirmations

#### Returns

`number`

---

### on()

> **on**(`event`, `listener`): `HITLManager`

Defined in: [types/hitl.ts:314](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/hitl.ts#L314)

EventEmitter methods for HITL events

#### Parameters

##### event

`string`

##### listener

(...`args`) => `void`

#### Returns

`HITLManager`

---

### emit()

> **emit**(`event`, ...`args`): `boolean`

Defined in: [types/hitl.ts:315](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/hitl.ts#L315)

#### Parameters

##### event

`string`

##### args

...`unknown`[]

#### Returns

`boolean`
