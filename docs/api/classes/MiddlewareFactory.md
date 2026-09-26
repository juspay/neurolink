[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / MiddlewareFactory

# Class: MiddlewareFactory

Middleware factory for creating and applying middleware chains.
Each factory instance manages its own registry and configuration.

## Constructors

### Constructor

> **new MiddlewareFactory**(`options?`): `MiddlewareFactory`

#### Parameters

##### options?

[`MiddlewareFactoryOptions`](../type-aliases/MiddlewareFactoryOptions.md) = `{}`

#### Returns

`MiddlewareFactory`

## Properties

### registry

> **registry**: `MiddlewareRegistry`

---

### presets

> **presets**: `Map`\<`string`, [`MiddlewarePreset`](../type-aliases/MiddlewarePreset.md)\>

## Methods

### registerPreset()

> **registerPreset**(`preset`, `replace?`): `void`

Register a custom preset

#### Parameters

##### preset

[`MiddlewarePreset`](../type-aliases/MiddlewarePreset.md)

##### replace?

`boolean` = `false`

#### Returns

`void`

---

### register()

> **register**(`middleware`, `options?`): `void`

Register a custom middleware

#### Parameters

##### middleware

[`NeuroLinkMiddleware`](../type-aliases/NeuroLinkMiddleware.md)

##### options?

[`MiddlewareRegistrationOptions`](../type-aliases/MiddlewareRegistrationOptions.md)

#### Returns

`void`

---

### applyMiddleware()

> **applyMiddleware**(`model`, `context`, `options?`): [`LanguageModel`](../type-aliases/LanguageModel.md)

Apply middleware to a language model

#### Parameters

##### model

[`LanguageModel`](../type-aliases/LanguageModel.md)

##### context

[`MiddlewareContext`](../type-aliases/MiddlewareContext.md)

##### options?

[`MiddlewareFactoryOptions`](../type-aliases/MiddlewareFactoryOptions.md) = `{}`

#### Returns

[`LanguageModel`](../type-aliases/LanguageModel.md)

---

### createContext()

> **createContext**(`provider`, `model`, `options?`, `session?`): [`MiddlewareContext`](../type-aliases/MiddlewareContext.md)

Create middleware context from provider and options

#### Parameters

##### provider

`string`

##### model

`string`

##### options?

`Record`\<`string`, `unknown`\> = `{}`

##### session?

###### sessionId?

`string`

###### userId?

`string`

#### Returns

[`MiddlewareContext`](../type-aliases/MiddlewareContext.md)

---

### validateConfig()

> **validateConfig**(`config`): `object`

Validate middleware configuration

#### Parameters

##### config

`Record`\<`string`, [`MiddlewareConfig`](../type-aliases/MiddlewareConfig.md)\>

#### Returns

`object`

##### isValid

> **isValid**: `boolean`

##### errors

> **errors**: `string`[]

##### warnings

> **warnings**: `string`[]

---

### getAvailablePresets()

> **getAvailablePresets**(): `object`[]

Get available presets

#### Returns

`object`[]

---

### getChainStats()

> **getChainStats**(`context`, `config`): [`MiddlewareChainStats`](../type-aliases/MiddlewareChainStats.md)

Get middleware chain statistics

#### Parameters

##### context

[`MiddlewareContext`](../type-aliases/MiddlewareContext.md)

##### config

`Record`\<`string`, [`MiddlewareConfig`](../type-aliases/MiddlewareConfig.md)\>

#### Returns

[`MiddlewareChainStats`](../type-aliases/MiddlewareChainStats.md)

---

### createModelFactory()

> **createModelFactory**(`baseModelFactory`, `defaultOptions?`): (`context`, `options`) => `Promise`\<[`LanguageModel`](../type-aliases/LanguageModel.md)\>

Create a middleware-enabled model factory function

#### Parameters

##### baseModelFactory

() => `Promise`\<[`LanguageModel`](../type-aliases/LanguageModel.md)\>

##### defaultOptions?

[`MiddlewareFactoryOptions`](../type-aliases/MiddlewareFactoryOptions.md) = `{}`

#### Returns

(`context`, `options`) => `Promise`\<[`LanguageModel`](../type-aliases/LanguageModel.md)\>
