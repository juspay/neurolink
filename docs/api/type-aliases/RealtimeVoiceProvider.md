[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / RealtimeVoiceProvider

# Type Alias: RealtimeVoiceProvider

> **RealtimeVoiceProvider** = `object`

Defined in: [types/realtime.ts:213](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/realtime.ts#L213)

Realtime voice provider type (bidirectional audio)

## Properties

### name

> `readonly` **name**: `string`

Defined in: [types/realtime.ts:215](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/realtime.ts#L215)

Provider name identifier

## Methods

### getCapabilities()

> **getCapabilities**(): `RealtimeProviderCapability`[]

Defined in: [types/realtime.ts:217](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/realtime.ts#L217)

Get supported capabilities

#### Returns

`RealtimeProviderCapability`[]

---

### isConfigured()

> **isConfigured**(): `boolean`

Defined in: [types/realtime.ts:219](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/realtime.ts#L219)

Check if provider is properly configured

#### Returns

`boolean`

---

### validateConfig()

> **validateConfig**(): `Promise`\<\{ `valid`: `boolean`; `errors`: `string`[]; \}\>

Defined in: [types/realtime.ts:221](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/realtime.ts#L221)

Validate provider configuration

#### Returns

`Promise`\<\{ `valid`: `boolean`; `errors`: `string`[]; \}\>

---

### getOptionsSchema()?

> `optional` **getOptionsSchema**(): `Record`\<`string`, `unknown`\>

Defined in: [types/realtime.ts:223](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/realtime.ts#L223)

Get provider-specific options schema

#### Returns

`Record`\<`string`, `unknown`\>

---

### connect()

> **connect**(`config`): `Promise`\<[`RealtimeSession`](RealtimeSession.md)\>

Defined in: [types/realtime.ts:227](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/realtime.ts#L227)

Create a new realtime session

#### Parameters

##### config

[`RealtimeConfig`](RealtimeConfig.md)

#### Returns

`Promise`\<[`RealtimeSession`](RealtimeSession.md)\>

---

### isConnected()

> **isConnected**(): `boolean`

Defined in: [types/realtime.ts:232](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/realtime.ts#L232)

Check if connected

#### Returns

`boolean`

---

### disconnect()

> **disconnect**(): `Promise`\<`void`\>

Defined in: [types/realtime.ts:237](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/realtime.ts#L237)

Disconnect from realtime session

#### Returns

`Promise`\<`void`\>

---

### getSessionConfig()

> **getSessionConfig**(): [`RealtimeConfig`](RealtimeConfig.md) \| `null`

Defined in: [types/realtime.ts:242](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/realtime.ts#L242)

Get current session configuration

#### Returns

[`RealtimeConfig`](RealtimeConfig.md) \| `null`
