[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / AIProviderFactory

# Class: AIProviderFactory

Defined in: [core/factory.ts:25](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/core/factory.ts#L25)

Factory for creating AI provider instances with centralized configuration

## Constructors

### Constructor

> **new AIProviderFactory**(): `AIProviderFactory`

#### Returns

`AIProviderFactory`

## Methods

### createProvider()

> `static` **createProvider**(`providerName`, `modelName?`, `enableMCP?`, `sdk?`, `region?`, `credentials?`): `Promise`\<[`AIProvider`](../type-aliases/AIProvider.md)\>

Defined in: [core/factory.ts:297](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/core/factory.ts#L297)

Create a provider instance for the specified provider type

#### Parameters

##### providerName

`string`

Name of the provider ('vertex', 'bedrock', 'openai')

##### modelName?

`string` \| `null`

Optional model name override

##### enableMCP?

`boolean` = `true`

Optional flag to enable MCP integration (default: true)

##### sdk?

[`UnknownRecord`](../type-aliases/UnknownRecord.md)

SDK instance

##### region?

`string`

Optional region override for cloud providers

##### credentials?

[`NeurolinkCredentials`](../type-aliases/NeurolinkCredentials.md)

#### Returns

`Promise`\<[`AIProvider`](../type-aliases/AIProvider.md)\>

AIProvider instance

---

### createProviderWithModel()

> `static` **createProviderWithModel**(`provider`, `model`): `Promise`\<[`AIProvider`](../type-aliases/AIProvider.md)\>

Defined in: [core/factory.ts:423](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/core/factory.ts#L423)

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

Defined in: [core/factory.ts:465](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/core/factory.ts#L465)

Create the best available provider automatically

#### Parameters

##### requestedProvider?

`string`

Optional preferred provider

##### modelName?

`string` \| `null`

Optional model name override

##### enableMCP?

`boolean` = `true`

Optional flag to enable MCP integration (default: true)

##### sdk?

[`UnknownRecord`](../type-aliases/UnknownRecord.md)

#### Returns

`Promise`\<[`AIProvider`](../type-aliases/AIProvider.md)\>

AIProvider instance

---

### createProviderWithFallback()

> `static` **createProviderWithFallback**(`primaryProvider`, `fallbackProvider`, `modelName?`, `enableMCP?`): `Promise`\<[`ProviderPairResult`](../type-aliases/ProviderPairResult.md)\<[`AIProvider`](../type-aliases/AIProvider.md)\>\>

Defined in: [core/factory.ts:505](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/core/factory.ts#L505)

Create primary and fallback provider instances

#### Parameters

##### primaryProvider

`string`

Primary provider name

##### fallbackProvider

`string`

Fallback provider name

##### modelName?

`string` \| `null`

Optional model name override

##### enableMCP?

`boolean` = `true`

Optional flag to enable MCP integration (default: true)

#### Returns

`Promise`\<[`ProviderPairResult`](../type-aliases/ProviderPairResult.md)\<[`AIProvider`](../type-aliases/AIProvider.md)\>\>

Object with primary and fallback providers
