[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / MiddlewareFactory

# Class: MiddlewareFactory

Defined in: [middleware/factory.ts:25](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/middleware/factory.ts#L25)

Middleware factory for creating and applying middleware chains.
Each factory instance manages its own registry and configuration.

## Constructors

### Constructor

> **new MiddlewareFactory**(`options?`): `MiddlewareFactory`

Defined in: [middleware/factory.ts:30](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/middleware/factory.ts#L30)

#### Parameters

##### options?

[`MiddlewareFactoryOptions`](../type-aliases/MiddlewareFactoryOptions.md) = `{}`

#### Returns

`MiddlewareFactory`

## Properties

### registry

> **registry**: `MiddlewareRegistry`

Defined in: [middleware/factory.ts:26](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/middleware/factory.ts#L26)

---

### presets

> **presets**: `Map`\<`string`, [`MiddlewarePreset`](../type-aliases/MiddlewarePreset.md)\>

Defined in: [middleware/factory.ts:27](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/middleware/factory.ts#L27)

## Methods

### registerPreset()

> **registerPreset**(`preset`, `replace?`): `void`

Defined in: [middleware/factory.ts:94](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/middleware/factory.ts#L94)

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

Defined in: [middleware/factory.ts:106](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/middleware/factory.ts#L106)

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

> **applyMiddleware**(`model`, `context`, `options?`): `LanguageModel`

Defined in: [middleware/factory.ts:116](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/middleware/factory.ts#L116)

Apply middleware to a language model

#### Parameters

##### model

`LanguageModel`

##### context

[`MiddlewareContext`](../type-aliases/MiddlewareContext.md)

##### options?

[`MiddlewareFactoryOptions`](../type-aliases/MiddlewareFactoryOptions.md) = `{}`

#### Returns

`LanguageModel`

---

### createContext()

> **createContext**(`provider`, `model`, `options?`, `session?`): [`MiddlewareContext`](../type-aliases/MiddlewareContext.md)

Defined in: [middleware/factory.ts:297](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/middleware/factory.ts#L297)

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

Defined in: [middleware/factory.ts:318](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/middleware/factory.ts#L318)

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

Defined in: [middleware/factory.ts:373](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/middleware/factory.ts#L373)

Get available presets

#### Returns

`object`[]

---

### getChainStats()

> **getChainStats**(`context`, `config`): [`MiddlewareChainStats`](../type-aliases/MiddlewareChainStats.md)

Defined in: [middleware/factory.ts:388](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/middleware/factory.ts#L388)

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

> **createModelFactory**(`baseModelFactory`, `defaultOptions?`): (`context`, `options`) => `Promise`\<`LanguageModel`\>

Defined in: [middleware/factory.ts:421](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/middleware/factory.ts#L421)

Create a middleware-enabled model factory function

#### Parameters

##### baseModelFactory

() => `Promise`\<`LanguageModel`\>

##### defaultOptions?

[`MiddlewareFactoryOptions`](../type-aliases/MiddlewareFactoryOptions.md) = `{}`

#### Returns

(`context`, `options`) => `Promise`\<`LanguageModel`\>
