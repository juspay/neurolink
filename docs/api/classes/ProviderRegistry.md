[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProviderRegistry

# Class: ProviderRegistry

Defined in: [factories/providerRegistry.ts:42](https://github.com/juspay/neurolink/blob/release/src/lib/factories/providerRegistry.ts#L42)

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

Defined in: [factories/providerRegistry.ts:53](https://github.com/juspay/neurolink/blob/release/src/lib/factories/providerRegistry.ts#L53)

NEW4: per-handler registration outcomes for the realtime voice
providers. `"ok"` = registered; any other string = the error message.
Empty until the first `registerAllProviders()` call.

## Methods

### getRegistrationReport()

> `static` **getRegistrationReport**(): `object`

Defined in: [factories/providerRegistry.ts:60](https://github.com/juspay/neurolink/blob/release/src/lib/factories/providerRegistry.ts#L60)

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

Defined in: [factories/providerRegistry.ts:67](https://github.com/juspay/neurolink/blob/release/src/lib/factories/providerRegistry.ts#L67)

Register all providers with the factory

#### Returns

`Promise`\<`void`\>

---

### isRegistered()

> `static` **isRegistered**(): `boolean`

Defined in: [factories/providerRegistry.ts:837](https://github.com/juspay/neurolink/blob/release/src/lib/factories/providerRegistry.ts#L837)

Check if providers are registered

#### Returns

`boolean`

---

### clearRegistrations()

> `static` **clearRegistrations**(): `void`

Defined in: [factories/providerRegistry.ts:844](https://github.com/juspay/neurolink/blob/release/src/lib/factories/providerRegistry.ts#L844)

Clear registrations (for testing)

#### Returns

`void`

---

### setOptions()

> `static` **setOptions**(`options`): `void`

Defined in: [factories/providerRegistry.ts:857](https://github.com/juspay/neurolink/blob/release/src/lib/factories/providerRegistry.ts#L857)

Set registry options (should be called before initialization)

#### Parameters

##### options

[`ProviderRegistryOptions`](../type-aliases/ProviderRegistryOptions.md)

#### Returns

`void`

---

### getOptions()

> `static` **getOptions**(): [`ProviderRegistryOptions`](../type-aliases/ProviderRegistryOptions.md)

Defined in: [factories/providerRegistry.ts:865](https://github.com/juspay/neurolink/blob/release/src/lib/factories/providerRegistry.ts#L865)

Get current registry options

#### Returns

[`ProviderRegistryOptions`](../type-aliases/ProviderRegistryOptions.md)
