[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProviderFactory

# Class: ProviderFactory

True Factory Pattern implementation for AI Providers
Uses registration-based approach to eliminate switch statements
and enable dynamic provider registration

## Constructors

### Constructor

> **new ProviderFactory**(): `ProviderFactory`

#### Returns

`ProviderFactory`

## Methods

### registerProvider()

> `static` **registerProvider**(`name`, `constructor`, `defaultModel?`, `aliases?`, `descriptor?`): `void`

Register a provider with the factory

#### Parameters

##### name

`string`

##### constructor

[`ProviderConstructor`](../type-aliases/ProviderConstructor.md)

##### defaultModel?

`string`

##### aliases?

`string`[] = `[]`

##### descriptor?

[`ProviderDescriptor`](../type-aliases/ProviderDescriptor.md)

#### Returns

`void`

---

### createProvider()

> `static` **createProvider**(`providerName?`, `modelName?`, `sdk?`, `region?`, `credentials?`): `Promise`\<[`AIProvider`](../type-aliases/AIProvider.md)\>

Create a provider instance

#### Parameters

##### providerName?

`string`

Provider name (optional, uses NEUROLINK_PROVIDER env var or 'vertex' as default)

##### modelName?

`string`

Model name (optional, uses provider-specific env var or registry default)

##### sdk?

[`NeuroLink`](NeuroLink.md)

##### region?

`string`

##### credentials?

[`NeurolinkCredentials`](../type-aliases/NeurolinkCredentials.md)

#### Returns

`Promise`\<[`AIProvider`](../type-aliases/AIProvider.md)\>

---

### hasProvider()

> `static` **hasProvider**(`providerName`): `boolean`

Check if a provider is registered

#### Parameters

##### providerName

`string`

#### Returns

`boolean`

---

### getAvailableProviders()

> `static` **getAvailableProviders**(): `string`[]

#### Returns

`string`[]

---

### getProviderInfo()

> `static` **getProviderInfo**(`providerName`): [`ProviderRegistration`](../type-aliases/ProviderRegistration.md) \| `undefined`

Get provider registration info

#### Parameters

##### providerName

`string`

#### Returns

[`ProviderRegistration`](../type-aliases/ProviderRegistration.md) \| `undefined`

---

### getDescriptor()

> `static` **getDescriptor**(`name`): [`ProviderDescriptor`](../type-aliases/ProviderDescriptor.md) \| `undefined`

Look up a provider's static descriptor. Checks the built-in
PROVIDER_DESCRIPTORS first (works even before registerAllProviders()
has run, and resolves aliases via PROVIDER_ALIAS_INDEX), then falls
back to whatever descriptor a live custom registration attached via
registerProvider()'s 5th parameter.

#### Parameters

##### name

`string`

#### Returns

[`ProviderDescriptor`](../type-aliases/ProviderDescriptor.md) \| `undefined`

---

### getAllDescriptors()

> `static` **getAllDescriptors**(): readonly [`ProviderDescriptor`](../type-aliases/ProviderDescriptor.md)[]

All built-in provider descriptors (does not include custom-registered providers that lack a descriptor).

#### Returns

readonly [`ProviderDescriptor`](../type-aliases/ProviderDescriptor.md)[]

---

### normalizeProviderName()

> `static` **normalizeProviderName**(`providerName`): `string` \| `null`

Normalize provider names using aliases (PHASE 1: Factory Pattern)

#### Parameters

##### providerName

`string`

#### Returns

`string` \| `null`

---

### clearRegistrations()

> `static` **clearRegistrations**(): `void`

Clear all registrations (mainly for testing)

#### Returns

`void`

---

### createBestProvider()

> `static` **createBestProvider**(`providerName`, `modelName?`, `enableMCP?`, `sdk?`, `credentials?`): `Promise`\<[`AIProvider`](../type-aliases/AIProvider.md)\>

Create the best available provider for the given name
Used by NeuroLink SDK for streaming and generation

#### Parameters

##### providerName

`string`

##### modelName?

`string`

##### enableMCP?

`boolean`

##### sdk?

[`NeuroLink`](NeuroLink.md)

##### credentials?

[`NeurolinkCredentials`](../type-aliases/NeurolinkCredentials.md)

#### Returns

`Promise`\<[`AIProvider`](../type-aliases/AIProvider.md)\>
