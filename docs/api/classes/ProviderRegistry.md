[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProviderRegistry

# Class: ProviderRegistry

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

NEW4: per-handler registration outcomes for the realtime voice
providers. `"ok"` = registered; any other string = the error message.
Empty until the first `registerAllProviders()` call.

## Methods

### getRegistrationReport()

> `static` **getRegistrationReport**(): `object`

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

Register all providers with the factory

#### Returns

`Promise`\<`void`\>

---

### isRegistered()

> `static` **isRegistered**(): `boolean`

Check if providers are registered

#### Returns

`boolean`

---

### clearRegistrations()

> `static` **clearRegistrations**(): `void`

Clear registrations (for testing)

#### Returns

`void`

---

### setOptions()

> `static` **setOptions**(`options`): `void`

Set registry options (should be called before initialization)

#### Parameters

##### options

[`ProviderRegistryOptions`](../type-aliases/ProviderRegistryOptions.md)

#### Returns

`void`

---

### getOptions()

> `static` **getOptions**(): [`ProviderRegistryOptions`](../type-aliases/ProviderRegistryOptions.md)

Get current registry options

#### Returns

[`ProviderRegistryOptions`](../type-aliases/ProviderRegistryOptions.md)
