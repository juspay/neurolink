[**NeuroLink API Reference v8.32.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / MiddlewareFactory

# Class: MiddlewareFactory

Defined in: [middleware/factory.ts:23](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/middleware/factory.ts#L23)

Middleware factory for creating and applying middleware chains.
Each factory instance manages its own registry and configuration.

## Constructors

### Constructor

> **new MiddlewareFactory**(`options`): `MiddlewareFactory`

Defined in: [middleware/factory.ts:28](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/middleware/factory.ts#L28)

#### Parameters

##### options

[`MiddlewareFactoryOptions`](../type-aliases/MiddlewareFactoryOptions.md) = `{}`

#### Returns

`MiddlewareFactory`

## Properties

### registry

> **registry**: `MiddlewareRegistry`

Defined in: [middleware/factory.ts:24](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/middleware/factory.ts#L24)

---

### presets

> **presets**: `Map`\<`string`, [`MiddlewarePreset`](../type-aliases/MiddlewarePreset.md)\>

Defined in: [middleware/factory.ts:25](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/middleware/factory.ts#L25)

## Methods

### registerPreset()

> **registerPreset**(`preset`, `replace`): `void`

Defined in: [middleware/factory.ts:91](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/middleware/factory.ts#L91)

Register a custom preset

#### Parameters

##### preset

[`MiddlewarePreset`](../type-aliases/MiddlewarePreset.md)

##### replace

`boolean` = `false`

#### Returns

`void`

---

### register()

> **register**(`middleware`, `options?`): `void`

Defined in: [middleware/factory.ts:103](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/middleware/factory.ts#L103)

Register a custom middleware

#### Parameters

##### middleware

[`NeuroLinkMiddleware`](../type-aliases/NeuroLinkMiddleware.md)

##### options?

`MiddlewareRegistrationOptions`

#### Returns

`void`

---

### applyMiddleware()

> **applyMiddleware**(`model`, `context`, `options`): `LanguageModelV1`

Defined in: [middleware/factory.ts:113](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/middleware/factory.ts#L113)

Apply middleware to a language model

#### Parameters

##### model

`LanguageModelV1`

##### context

[`MiddlewareContext`](../type-aliases/MiddlewareContext.md)

##### options

[`MiddlewareFactoryOptions`](../type-aliases/MiddlewareFactoryOptions.md) = `{}`

#### Returns

`LanguageModelV1`

---

### createContext()

> **createContext**(`provider`, `model`, `options`, `session?`): [`MiddlewareContext`](../type-aliases/MiddlewareContext.md)

Defined in: [middleware/factory.ts:292](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/middleware/factory.ts#L292)

Create middleware context from provider and options

#### Parameters

##### provider

`string`

##### model

`string`

##### options

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

Defined in: [middleware/factory.ts:313](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/middleware/factory.ts#L313)

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

Defined in: [middleware/factory.ts:368](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/middleware/factory.ts#L368)

Get available presets

#### Returns

`object`[]

---

### getChainStats()

> **getChainStats**(`context`, `config`): `MiddlewareChainStats`

Defined in: [middleware/factory.ts:383](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/middleware/factory.ts#L383)

Get middleware chain statistics

#### Parameters

##### context

[`MiddlewareContext`](../type-aliases/MiddlewareContext.md)

##### config

`Record`\<`string`, [`MiddlewareConfig`](../type-aliases/MiddlewareConfig.md)\>

#### Returns

`MiddlewareChainStats`

---

### createModelFactory()

> **createModelFactory**(`baseModelFactory`, `defaultOptions`): (`context`, `options`) => `Promise`\<`LanguageModelV1`\>

Defined in: [middleware/factory.ts:416](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/middleware/factory.ts#L416)

Create a middleware-enabled model factory function

#### Parameters

##### baseModelFactory

() => `Promise`\<`LanguageModelV1`\>

##### defaultOptions

[`MiddlewareFactoryOptions`](../type-aliases/MiddlewareFactoryOptions.md) = `{}`

#### Returns

> (`context`, `options`): `Promise`\<`LanguageModelV1`\>

##### Parameters

###### context

[`MiddlewareContext`](../type-aliases/MiddlewareContext.md)

###### options

[`MiddlewareFactoryOptions`](../type-aliases/MiddlewareFactoryOptions.md) = `{}`

##### Returns

`Promise`\<`LanguageModelV1`\>
