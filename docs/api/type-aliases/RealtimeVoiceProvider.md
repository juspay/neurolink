[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RealtimeVoiceProvider

# Type Alias: RealtimeVoiceProvider

> **RealtimeVoiceProvider** = `object`

Realtime voice provider type (bidirectional audio)

## Properties

### name

> `readonly` **name**: `string`

Provider name identifier

## Methods

### getCapabilities()

> **getCapabilities**(): `RealtimeProviderCapability`[]

Get supported capabilities

#### Returns

`RealtimeProviderCapability`[]

---

### isConfigured()

> **isConfigured**(): `boolean`

Check if provider is properly configured

#### Returns

`boolean`

---

### validateConfig()

> **validateConfig**(): `Promise`\<\{ `valid`: `boolean`; `errors`: `string`[]; \}\>

Validate provider configuration

#### Returns

`Promise`\<\{ `valid`: `boolean`; `errors`: `string`[]; \}\>

---

### getOptionsSchema()?

> `optional` **getOptionsSchema**(): `Record`\<`string`, `unknown`\>

Get provider-specific options schema

#### Returns

`Record`\<`string`, `unknown`\>

---

### connect()

> **connect**(`config`): `Promise`\<[`RealtimeSession`](RealtimeSession.md)\>

Create a new realtime session

#### Parameters

##### config

[`RealtimeConfig`](RealtimeConfig.md)

#### Returns

`Promise`\<[`RealtimeSession`](RealtimeSession.md)\>

---

### isConnected()

> **isConnected**(): `boolean`

Check if connected

#### Returns

`boolean`

---

### disconnect()

> **disconnect**(): `Promise`\<`void`\>

Disconnect from realtime session

#### Returns

`Promise`\<`void`\>

---

### getSessionConfig()

> **getSessionConfig**(): [`RealtimeConfig`](RealtimeConfig.md) \| `null`

Get current session configuration

#### Returns

[`RealtimeConfig`](RealtimeConfig.md) \| `null`
