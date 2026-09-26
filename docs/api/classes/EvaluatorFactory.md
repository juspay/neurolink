[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / EvaluatorFactory

# Class: EvaluatorFactory

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

#### Inherited from

[`BaseFactory`](BaseFactory.md).[`items`](BaseFactory.md#items)

---

### aliasMap

> `protected` **aliasMap**: `Map`\<`string`, `string`\>

#### Inherited from

[`BaseFactory`](BaseFactory.md).[`aliasMap`](BaseFactory.md#aliasmap)

---

### initialized

> `protected` **initialized**: `boolean` = `false`

#### Inherited from

[`BaseFactory`](BaseFactory.md).[`initialized`](BaseFactory.md#initialized)

---

### initPromise

> `protected` **initPromise**: `Promise`\<`void`\> \| `null` = `null`

#### Inherited from

[`BaseFactory`](BaseFactory.md).[`initPromise`](BaseFactory.md#initpromise)

## Methods

### ensureInitialized()

> **ensureInitialized**(): `Promise`\<`void`\>

#### Returns

`Promise`\<`void`\>

#### Inherited from

[`BaseFactory`](BaseFactory.md).[`ensureInitialized`](BaseFactory.md#ensureinitialized)

---

### register()

> **register**(`name`, `factory`, `aliases?`, `metadata?`): `void`

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

#### Returns

`string`[]

#### Inherited from

[`BaseFactory`](BaseFactory.md).[`getAvailable`](BaseFactory.md#getavailable)

---

### getAliases()

> **getAliases**(): `Map`\<`string`, `string`\>

#### Returns

`Map`\<`string`, `string`\>

#### Inherited from

[`BaseFactory`](BaseFactory.md).[`getAliases`](BaseFactory.md#getaliases)

---

### clear()

> **clear**(): `void`

#### Returns

`void`

#### Inherited from

[`BaseFactory`](BaseFactory.md).[`clear`](BaseFactory.md#clear)

---

### getInstance()

> `static` **getInstance**(): `EvaluatorFactory`

Gets the singleton instance of the EvaluatorFactory.

#### Returns

`EvaluatorFactory`

---

### resetInstance()

> `static` **resetInstance**(): `void`

Resets the singleton instance (useful for testing).

#### Returns

`void`

---

### registerAll()

> `protected` **registerAll**(): `Promise`\<`void`\>

Registers all built-in evaluator configurations.
This is called automatically on first access.

#### Returns

`Promise`\<`void`\>

#### Overrides

[`BaseFactory`](BaseFactory.md).[`registerAll`](BaseFactory.md#registerall)

---

### createEvaluator()

> **createEvaluator**(`presetOrName?`, `config?`): `Promise`\<[`Evaluator`](Evaluator.md)\>

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

Lists all available presets with their descriptions.

#### Returns

`Promise`\<`object`[]\>

Array of preset information

---

### validateConfig()

> **validateConfig**(`config`): `void`

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

Unregisters a preset from the factory.

#### Parameters

##### name

`string`

The preset name to remove

#### Returns

`boolean`

true if the preset was removed, false if it didn't exist
