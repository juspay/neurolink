[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ContextFactory

# Class: ContextFactory

Factory for context processing

## Constructors

### Constructor

> **new ContextFactory**(): `ContextFactory`

#### Returns

`ContextFactory`

## Properties

### DEFAULT_FRAMEWORK_FIELDS

> `readonly` `static` **DEFAULT_FRAMEWORK_FIELDS**: [`FrameworkFieldsConfig`](../type-aliases/FrameworkFieldsConfig.md)

Default framework fields configuration

---

### DEFAULT_CONFIG

> `readonly` `static` **DEFAULT_CONFIG**: [`ContextConfig`](../type-aliases/ContextConfig.md)

Default context configuration

## Methods

### configureFrameworkFields()

> `static` **configureFrameworkFields**(`config`): `void`

Configure framework fields for exclusion from custom data

#### Parameters

##### config

`Partial`\<[`FrameworkFieldsConfig`](../type-aliases/FrameworkFieldsConfig.md)\>

#### Returns

`void`

---

### getFrameworkFieldsConfig()

> `static` **getFrameworkFieldsConfig**(): [`FrameworkFieldsConfig`](../type-aliases/FrameworkFieldsConfig.md)

Get current framework fields configuration
Ensures lazy initialization if not already loaded

#### Returns

[`FrameworkFieldsConfig`](../type-aliases/FrameworkFieldsConfig.md)

---

### resetFrameworkFieldsConfig()

> `static` **resetFrameworkFieldsConfig**(): `void`

Reset framework fields configuration to default

#### Returns

`void`

---

### loadFrameworkFieldsFromEnv()

> `static` **loadFrameworkFieldsFromEnv**(): `void`

Load framework fields configuration from environment variables
Supports NEUROLINK_CONTEXT_EXCLUDE_FIELDS and NEUROLINK_CONTEXT_INCLUDE_FIELDS

#### Returns

`void`

---

### addFrameworkFieldsToExclude()

> `static` **addFrameworkFieldsToExclude**(`fields`): `void`

Add additional fields to exclude

#### Parameters

##### fields

`string`[]

#### Returns

`void`

---

### addFrameworkFieldsToInclude()

> `static` **addFrameworkFieldsToInclude**(`fields`): `void`

Add fields to include (override exclusion)

#### Parameters

##### fields

`string`[]

#### Returns

`void`

---

### validateContext()

> `static` **validateContext**(`context`): [`BaseContext`](../type-aliases/BaseContext.md) \| `null`

Validate and normalize context data

#### Parameters

##### context

`unknown`

#### Returns

[`BaseContext`](../type-aliases/BaseContext.md) \| `null`

---

### processContext()

> `static` **processContext**(`context`, `config?`): `ProcessedContext`

Process context for AI generation based on configuration

#### Parameters

##### context

[`BaseContext`](../type-aliases/BaseContext.md)

##### config?

`Partial`\<[`ContextConfig`](../type-aliases/ContextConfig.md)\> = `{}`

#### Returns

`ProcessedContext`

---

### extractAnalyticsContext()

> `static` **extractAnalyticsContext**(`context`): [`JsonObject`](../type-aliases/JsonObject.md)

Extract analytics data from context

#### Parameters

##### context

[`BaseContext`](../type-aliases/BaseContext.md)

#### Returns

[`JsonObject`](../type-aliases/JsonObject.md)

---

### extractEvaluationContext()

> `static` **extractEvaluationContext**(`context`): [`JsonObject`](../type-aliases/JsonObject.md)

Extract evaluation context

#### Parameters

##### context

[`BaseContext`](../type-aliases/BaseContext.md)

#### Returns

[`JsonObject`](../type-aliases/JsonObject.md)
