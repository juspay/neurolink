[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProviderFactory

# Class: ProviderFactory

Defined in: [factories/providerFactory.ts:48](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/factories/providerFactory.ts#L48)

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

Defined in: [factories/providerFactory.ts:55](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/factories/providerFactory.ts#L55)

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

Defined in: [factories/providerFactory.ts:86](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/factories/providerFactory.ts#L86)

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

Defined in: [factories/providerFactory.ts:167](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/factories/providerFactory.ts#L167)

Check if a provider is registered

#### Parameters

##### providerName

`string`

#### Returns

`boolean`

---

### getAvailableProviders()

> `static` **getAvailableProviders**(): `string`[]

Defined in: [factories/providerFactory.ts:173](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/factories/providerFactory.ts#L173)

Get list of available providers

#### Returns

`string`[]

---

### getProviderInfo()

> `static` **getProviderInfo**(`providerName`): [`ProviderRegistration`](../type-aliases/ProviderRegistration.md) \| `undefined`

Defined in: [factories/providerFactory.ts:182](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/factories/providerFactory.ts#L182)

Get provider registration info

#### Parameters

##### providerName

`string`

#### Returns

[`ProviderRegistration`](../type-aliases/ProviderRegistration.md) \| `undefined`

---

### getDescriptor()

> `static` **getDescriptor**(`name`): [`ProviderDescriptor`](../type-aliases/ProviderDescriptor.md) \| `undefined`

Defined in: [factories/providerFactory.ts:195](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/factories/providerFactory.ts#L195)

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

Defined in: [factories/providerFactory.ts:208](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/factories/providerFactory.ts#L208)

All built-in provider descriptors (does not include custom-registered providers that lack a descriptor).

#### Returns

readonly [`ProviderDescriptor`](../type-aliases/ProviderDescriptor.md)[]

---

### normalizeProviderName()

> `static` **normalizeProviderName**(`providerName`): `string` \| `null`

Defined in: [factories/providerFactory.ts:215](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/factories/providerFactory.ts#L215)

Normalize provider names using aliases (PHASE 1: Factory Pattern)

#### Parameters

##### providerName

`string`

#### Returns

`string` \| `null`

---

### clearRegistrations()

> `static` **clearRegistrations**(): `void`

Defined in: [factories/providerFactory.ts:237](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/factories/providerFactory.ts#L237)

Clear all registrations (mainly for testing)

#### Returns

`void`

---

### createBestProvider()

> `static` **createBestProvider**(`providerName`, `modelName?`, `enableMCP?`, `sdk?`, `credentials?`): `Promise`\<[`AIProvider`](../type-aliases/AIProvider.md)\>

Defined in: [factories/providerFactory.ts:267](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/factories/providerFactory.ts#L267)

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
