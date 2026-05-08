[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / EvaluatorFactory

# Class: EvaluatorFactory

Defined in: [evaluation/EvaluatorFactory.ts:33](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/evaluation/EvaluatorFactory.ts#L33)

Factory for creating Evaluator instances with various configurations.
Supports presets for common use cases and custom configurations.

## Example

```typescript
const factory = EvaluatorFactory.getInstance();

// Create with default configuration
const evaluator = await factory.create("default");

// Create with a preset
const strictEvaluator = await factory.create("strict");

// Create with custom config
const customEvaluator = await factory.create("default", {
  threshold: 9,
  evaluationModel: "gpt-4",
  provider: "openai",
});
```

## Extends

- [`BaseFactory`](BaseFactory.md)\<[`Evaluator`](Evaluator.md), [`EvaluationConfig`](../type-aliases/EvaluationConfig.md)\>

## Properties

### items

> `protected` **items**: `Map`\<`string`, [`FactoryRegistration`](../type-aliases/FactoryRegistration.md)\<[`Evaluator`](Evaluator.md), [`EvaluationConfig`](../type-aliases/EvaluationConfig.md)\>\>

Defined in: [core/infrastructure/baseFactory.ts:8](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/core/infrastructure/baseFactory.ts#L8)

#### Inherited from

[`BaseFactory`](BaseFactory.md).[`items`](BaseFactory.md#items)

---

### aliasMap

> `protected` **aliasMap**: `Map`\<`string`, `string`\>

Defined in: [core/infrastructure/baseFactory.ts:9](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/core/infrastructure/baseFactory.ts#L9)

#### Inherited from

[`BaseFactory`](BaseFactory.md).[`aliasMap`](BaseFactory.md#aliasmap)

---

### initialized

> `protected` **initialized**: `boolean` = `false`

Defined in: [core/infrastructure/baseFactory.ts:10](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/core/infrastructure/baseFactory.ts#L10)

#### Inherited from

[`BaseFactory`](BaseFactory.md).[`initialized`](BaseFactory.md#initialized)

---

### initPromise

> `protected` **initPromise**: `Promise`\<`void`\> \| `null` = `null`

Defined in: [core/infrastructure/baseFactory.ts:11](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/core/infrastructure/baseFactory.ts#L11)

#### Inherited from

[`BaseFactory`](BaseFactory.md).[`initPromise`](BaseFactory.md#initpromise)

## Methods

### ensureInitialized()

> **ensureInitialized**(): `Promise`\<`void`\>

Defined in: [core/infrastructure/baseFactory.ts:15](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/core/infrastructure/baseFactory.ts#L15)

#### Returns

`Promise`\<`void`\>

#### Inherited from

[`BaseFactory`](BaseFactory.md).[`ensureInitialized`](BaseFactory.md#ensureinitialized)

---

### register()

> **register**(`name`, `factory`, `aliases?`, `metadata?`): `void`

Defined in: [core/infrastructure/baseFactory.ts:27](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/core/infrastructure/baseFactory.ts#L27)

#### Parameters

##### name

`string`

##### factory

[`FactoryFunction`](../type-aliases/FactoryFunction.md)\<[`Evaluator`](Evaluator.md), [`EvaluationConfig`](../type-aliases/EvaluationConfig.md)\>

##### aliases?

`string`[] = `[]`

##### metadata?

`Record`\<`string`, `unknown`\>

#### Returns

`void`

#### Inherited from

[`BaseFactory`](BaseFactory.md).[`register`](BaseFactory.md#register)

---

### create()

> **create**(`nameOrAlias`, `config?`): `Promise`\<[`Evaluator`](Evaluator.md)\>

Defined in: [core/infrastructure/baseFactory.ts:40](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/core/infrastructure/baseFactory.ts#L40)

#### Parameters

##### nameOrAlias

`string`

##### config?

[`EvaluationConfig`](../type-aliases/EvaluationConfig.md)

#### Returns

`Promise`\<[`Evaluator`](Evaluator.md)\>

#### Inherited from

[`BaseFactory`](BaseFactory.md).[`create`](BaseFactory.md#create)

---

### resolveName()

> **resolveName**(`nameOrAlias`): `string`

Defined in: [core/infrastructure/baseFactory.ts:50](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/core/infrastructure/baseFactory.ts#L50)

#### Parameters

##### nameOrAlias

`string`

#### Returns

`string`

#### Inherited from

[`BaseFactory`](BaseFactory.md).[`resolveName`](BaseFactory.md#resolvename)

---

### has()

> **has**(`nameOrAlias`): `boolean`

Defined in: [core/infrastructure/baseFactory.ts:55](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/core/infrastructure/baseFactory.ts#L55)

#### Parameters

##### nameOrAlias

`string`

#### Returns

`boolean`

#### Inherited from

[`BaseFactory`](BaseFactory.md).[`has`](BaseFactory.md#has)

---

### getAvailable()

> **getAvailable**(): `string`[]

Defined in: [core/infrastructure/baseFactory.ts:60](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/core/infrastructure/baseFactory.ts#L60)

#### Returns

`string`[]

#### Inherited from

[`BaseFactory`](BaseFactory.md).[`getAvailable`](BaseFactory.md#getavailable)

---

### getAliases()

> **getAliases**(): `Map`\<`string`, `string`\>

Defined in: [core/infrastructure/baseFactory.ts:64](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/core/infrastructure/baseFactory.ts#L64)

#### Returns

`Map`\<`string`, `string`\>

#### Inherited from

[`BaseFactory`](BaseFactory.md).[`getAliases`](BaseFactory.md#getaliases)

---

### clear()

> **clear**(): `void`

Defined in: [core/infrastructure/baseFactory.ts:68](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/core/infrastructure/baseFactory.ts#L68)

#### Returns

`void`

#### Inherited from

[`BaseFactory`](BaseFactory.md).[`clear`](BaseFactory.md#clear)

---

### getInstance()

> `static` **getInstance**(): `EvaluatorFactory`

Defined in: [evaluation/EvaluatorFactory.ts:43](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/evaluation/EvaluatorFactory.ts#L43)

Gets the singleton instance of the EvaluatorFactory.

#### Returns

`EvaluatorFactory`

---

### resetInstance()

> `static` **resetInstance**(): `void`

Defined in: [evaluation/EvaluatorFactory.ts:53](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/evaluation/EvaluatorFactory.ts#L53)

Resets the singleton instance (useful for testing).

#### Returns

`void`

---

### registerAll()

> `protected` **registerAll**(): `Promise`\<`void`\>

Defined in: [evaluation/EvaluatorFactory.ts:61](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/evaluation/EvaluatorFactory.ts#L61)

Registers all built-in evaluator configurations.
This is called automatically on first access.

#### Returns

`Promise`\<`void`\>

#### Overrides

[`BaseFactory`](BaseFactory.md).[`registerAll`](BaseFactory.md#registerall)

---

### createEvaluator()

> **createEvaluator**(`presetOrName?`, `config?`): `Promise`\<[`Evaluator`](Evaluator.md)\>

Defined in: [evaluation/EvaluatorFactory.ts:199](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/evaluation/EvaluatorFactory.ts#L199)

Creates an evaluator instance with the specified preset and optional config overrides.

#### Parameters

##### presetOrName?

`string` = `"default"`

The preset name or alias

##### config?

[`EvaluationConfig`](../type-aliases/EvaluationConfig.md)

Optional configuration overrides

#### Returns

`Promise`\<[`Evaluator`](Evaluator.md)\>

A configured Evaluator instance

---

### createCustomEvaluator()

> **createCustomEvaluator**(`config`): [`Evaluator`](Evaluator.md)

Defined in: [evaluation/EvaluatorFactory.ts:212](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/evaluation/EvaluatorFactory.ts#L212)

Creates an evaluator with a fully custom configuration (not based on a preset).

#### Parameters

##### config

[`EvaluationConfig`](../type-aliases/EvaluationConfig.md)

The evaluation configuration

#### Returns

[`Evaluator`](Evaluator.md)

A configured Evaluator instance

---

### getPresetInfo()

> **getPresetInfo**(`presetOrName`): `Promise`\<[`EvaluatorPreset`](../type-aliases/EvaluatorPreset.md) \| `undefined`\>

Defined in: [evaluation/EvaluatorFactory.ts:223](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/evaluation/EvaluatorFactory.ts#L223)

Gets information about a preset by name or alias.

#### Parameters

##### presetOrName

`string`

The preset name or alias

#### Returns

`Promise`\<[`EvaluatorPreset`](../type-aliases/EvaluatorPreset.md) \| `undefined`\>

The preset information or undefined if not found

---

### listPresets()

> **listPresets**(): `Promise`\<`object`[]\>

Defined in: [evaluation/EvaluatorFactory.ts:240](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/evaluation/EvaluatorFactory.ts#L240)

Lists all available presets with their descriptions.

#### Returns

`Promise`\<`object`[]\>

Array of preset information

---

### validateConfig()

> **validateConfig**(`config`): `void`

Defined in: [evaluation/EvaluatorFactory.ts:274](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/evaluation/EvaluatorFactory.ts#L274)

Validates an evaluation configuration.

#### Parameters

##### config

[`EvaluationConfig`](../type-aliases/EvaluationConfig.md)

The configuration to validate

#### Returns

`void`

#### Throws

If the configuration is invalid

---

### registerPreset()

> **registerPreset**(`name`, `config`, `aliases?`, `description?`): `void`

Defined in: [evaluation/EvaluatorFactory.ts:321](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/evaluation/EvaluatorFactory.ts#L321)

Registers a custom evaluator preset.

#### Parameters

##### name

`string`

Unique name for the preset

##### config

[`EvaluationConfig`](../type-aliases/EvaluationConfig.md)

The evaluation configuration for this preset

##### aliases?

`string`[] = `[]`

Alternative names for the preset

##### description?

`string` = `""`

Human-readable description

#### Returns

`void`

---

### unregisterPreset()

> **unregisterPreset**(`name`): `boolean`

Defined in: [evaluation/EvaluatorFactory.ts:358](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/evaluation/EvaluatorFactory.ts#L358)

Unregisters a preset from the factory.

#### Parameters

##### name

`string`

The preset name to remove

#### Returns

`boolean`

true if the preset was removed, false if it didn't exist
