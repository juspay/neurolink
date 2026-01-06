[**NeuroLink API Reference v8.32.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / AIProviderFactory

# Class: AIProviderFactory

Defined in: [core/factory.ts:18](https://github.com/juspay/neurolink/blob/e2ee0ff27847312a233f21617e325b3d2c69c76c/src/lib/core/factory.ts#L18)

Factory for creating AI provider instances with centralized configuration

## Constructors

### Constructor

> **new AIProviderFactory**(): `AIProviderFactory`

#### Returns

`AIProviderFactory`

## Methods

### createProvider()

> `static` **createProvider**(`providerName`, `modelName?`, `enableMCP?`, `sdk?`, `region?`): `Promise`\<[`AIProvider`](../type-aliases/AIProvider.md)\>

Defined in: [core/factory.ts:81](https://github.com/juspay/neurolink/blob/e2ee0ff27847312a233f21617e325b3d2c69c76c/src/lib/core/factory.ts#L81)

Create a provider instance for the specified provider type

#### Parameters

##### providerName

`string`

Name of the provider ('vertex', 'bedrock', 'openai')

##### modelName?

Optional model name override

`string` | `null`

##### enableMCP?

`boolean` = `true`

Optional flag to enable MCP integration (default: true)

##### sdk?

`UnknownRecord`

SDK instance

##### region?

`string`

Optional region override for cloud providers

#### Returns

`Promise`\<[`AIProvider`](../type-aliases/AIProvider.md)\>

AIProvider instance

---

### createProviderWithModel()

> `static` **createProviderWithModel**(`provider`, `model`): `Promise`\<[`AIProvider`](../type-aliases/AIProvider.md)\>

Defined in: [core/factory.ts:346](https://github.com/juspay/neurolink/blob/e2ee0ff27847312a233f21617e325b3d2c69c76c/src/lib/core/factory.ts#L346)

Create a provider instance with specific provider enum and model

#### Parameters

##### provider

[`AIProviderName`](../enumerations/AIProviderName.md)

Provider enum value

##### model

[`SupportedModelName`](../type-aliases/SupportedModelName.md)

Specific model enum value

#### Returns

`Promise`\<[`AIProvider`](../type-aliases/AIProvider.md)\>

AIProvider instance

---

### createBestProvider()

> `static` **createBestProvider**(`requestedProvider?`, `modelName?`, `enableMCP?`, `sdk?`): `Promise`\<[`AIProvider`](../type-aliases/AIProvider.md)\>

Defined in: [core/factory.ts:388](https://github.com/juspay/neurolink/blob/e2ee0ff27847312a233f21617e325b3d2c69c76c/src/lib/core/factory.ts#L388)

Create the best available provider automatically

#### Parameters

##### requestedProvider?

`string`

Optional preferred provider

##### modelName?

Optional model name override

`string` | `null`

##### enableMCP?

`boolean` = `true`

Optional flag to enable MCP integration (default: true)

##### sdk?

`UnknownRecord`

#### Returns

`Promise`\<[`AIProvider`](../type-aliases/AIProvider.md)\>

AIProvider instance

---

### createProviderWithFallback()

> `static` **createProviderWithFallback**(`primaryProvider`, `fallbackProvider`, `modelName?`, `enableMCP?`): `Promise`\<`ProviderPairResult`\<[`AIProvider`](../type-aliases/AIProvider.md)\>\>

Defined in: [core/factory.ts:428](https://github.com/juspay/neurolink/blob/e2ee0ff27847312a233f21617e325b3d2c69c76c/src/lib/core/factory.ts#L428)

Create primary and fallback provider instances

#### Parameters

##### primaryProvider

`string`

Primary provider name

##### fallbackProvider

`string`

Fallback provider name

##### modelName?

Optional model name override

`string` | `null`

##### enableMCP?

`boolean` = `true`

Optional flag to enable MCP integration (default: true)

#### Returns

`Promise`\<`ProviderPairResult`\<[`AIProvider`](../type-aliases/AIProvider.md)\>\>

Object with primary and fallback providers
