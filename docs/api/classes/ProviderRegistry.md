[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProviderRegistry

# Class: ProviderRegistry

Defined in: [factories/providerRegistry.ts:41](https://github.com/juspay/neurolink/blob/release/src/lib/factories/providerRegistry.ts#L41)

Provider Registry - registers all providers with the factory
This is where we migrate providers one by one to the new pattern

## Constructors

### Constructor

> **new ProviderRegistry**(): `ProviderRegistry`

#### Returns

`ProviderRegistry`

## Properties

### realtimeRegistration

> `static` **realtimeRegistration**: `Record`\<`string`, `"ok"` \| `string`\> = `{}`

Defined in: [factories/providerRegistry.ts:52](https://github.com/juspay/neurolink/blob/release/src/lib/factories/providerRegistry.ts#L52)

NEW4: per-handler registration outcomes for the realtime voice
providers. `"ok"` = registered; any other string = the error message.
Empty until the first `registerAllProviders()` call.

## Methods

### getRegistrationReport()

> `static` **getRegistrationReport**(): `object`

Defined in: [factories/providerRegistry.ts:59](https://github.com/juspay/neurolink/blob/release/src/lib/factories/providerRegistry.ts#L59)

Returns a snapshot of voice provider registration outcomes so callers
can detect at runtime which voice handlers are usable. Useful in
health-check endpoints and CI startup probes.

#### Returns

`object`

##### realtime

> **realtime**: `Record`\<`string`, `"ok"` \| `string`\>

---

### registerAllProviders()

> `static` **registerAllProviders**(): `Promise`\<`void`\>

Defined in: [factories/providerRegistry.ts:66](https://github.com/juspay/neurolink/blob/release/src/lib/factories/providerRegistry.ts#L66)

Register all providers with the factory

#### Returns

`Promise`\<`void`\>

---

### isRegistered()

> `static` **isRegistered**(): `boolean`

Defined in: [factories/providerRegistry.ts:811](https://github.com/juspay/neurolink/blob/release/src/lib/factories/providerRegistry.ts#L811)

Check if providers are registered

#### Returns

`boolean`

---

### clearRegistrations()

> `static` **clearRegistrations**(): `void`

Defined in: [factories/providerRegistry.ts:818](https://github.com/juspay/neurolink/blob/release/src/lib/factories/providerRegistry.ts#L818)

Clear registrations (for testing)

#### Returns

`void`

---

### setOptions()

> `static` **setOptions**(`options`): `void`

Defined in: [factories/providerRegistry.ts:831](https://github.com/juspay/neurolink/blob/release/src/lib/factories/providerRegistry.ts#L831)

Set registry options (should be called before initialization)

#### Parameters

##### options

[`ProviderRegistryOptions`](../type-aliases/ProviderRegistryOptions.md)

#### Returns

`void`

---

### getOptions()

> `static` **getOptions**(): [`ProviderRegistryOptions`](../type-aliases/ProviderRegistryOptions.md)

Defined in: [factories/providerRegistry.ts:839](https://github.com/juspay/neurolink/blob/release/src/lib/factories/providerRegistry.ts#L839)

Get current registry options

#### Returns

[`ProviderRegistryOptions`](../type-aliases/ProviderRegistryOptions.md)
