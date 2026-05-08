[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / ContextFactory

# Class: ContextFactory

Defined in: [types/context.ts:99](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/context.ts#L99)

Factory for context processing

## Constructors

### Constructor

> **new ContextFactory**(): `ContextFactory`

#### Returns

`ContextFactory`

## Properties

### DEFAULT_FRAMEWORK_FIELDS

> `readonly` `static` **DEFAULT_FRAMEWORK_FIELDS**: [`FrameworkFieldsConfig`](../type-aliases/FrameworkFieldsConfig.md)

Defined in: [types/context.ts:103](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/context.ts#L103)

Default framework fields configuration

---

### DEFAULT_CONFIG

> `readonly` `static` **DEFAULT_CONFIG**: [`ContextConfig`](../type-aliases/ContextConfig.md)

Defined in: [types/context.ts:234](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/context.ts#L234)

Default context configuration

## Methods

### configureFrameworkFields()

> `static` **configureFrameworkFields**(`config`): `void`

Defined in: [types/context.ts:138](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/context.ts#L138)

Configure framework fields for exclusion from custom data

#### Parameters

##### config

`Partial`\<[`FrameworkFieldsConfig`](../type-aliases/FrameworkFieldsConfig.md)\>

#### Returns

`void`

---

### getFrameworkFieldsConfig()

> `static` **getFrameworkFieldsConfig**(): [`FrameworkFieldsConfig`](../type-aliases/FrameworkFieldsConfig.md)

Defined in: [types/context.ts:152](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/context.ts#L152)

Get current framework fields configuration
Ensures lazy initialization if not already loaded

#### Returns

[`FrameworkFieldsConfig`](../type-aliases/FrameworkFieldsConfig.md)

---

### resetFrameworkFieldsConfig()

> `static` **resetFrameworkFieldsConfig**(): `void`

Defined in: [types/context.ts:164](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/context.ts#L164)

Reset framework fields configuration to default

#### Returns

`void`

---

### loadFrameworkFieldsFromEnv()

> `static` **loadFrameworkFieldsFromEnv**(): `void`

Defined in: [types/context.ts:174](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/context.ts#L174)

Load framework fields configuration from environment variables
Supports NEUROLINK_CONTEXT_EXCLUDE_FIELDS and NEUROLINK_CONTEXT_INCLUDE_FIELDS

#### Returns

`void`

---

### addFrameworkFieldsToExclude()

> `static` **addFrameworkFieldsToExclude**(`fields`): `void`

Defined in: [types/context.ts:214](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/context.ts#L214)

Add additional fields to exclude

#### Parameters

##### fields

`string`[]

#### Returns

`void`

---

### addFrameworkFieldsToInclude()

> `static` **addFrameworkFieldsToInclude**(`fields`): `void`

Defined in: [types/context.ts:224](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/context.ts#L224)

Add fields to include (override exclusion)

#### Parameters

##### fields

`string`[]

#### Returns

`void`

---

### validateContext()

> `static` **validateContext**(`context`): [`BaseContext`](../type-aliases/BaseContext.md) \| `null`

Defined in: [types/context.ts:245](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/context.ts#L245)

Validate and normalize context data

#### Parameters

##### context

`unknown`

#### Returns

[`BaseContext`](../type-aliases/BaseContext.md) \| `null`

---

### processContext()

> `static` **processContext**(`context`, `config?`): `ProcessedContext`

Defined in: [types/context.ts:269](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/context.ts#L269)

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

Defined in: [types/context.ts:420](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/context.ts#L420)

Extract analytics data from context

#### Parameters

##### context

[`BaseContext`](../type-aliases/BaseContext.md)

#### Returns

[`JsonObject`](../type-aliases/JsonObject.md)

---

### extractEvaluationContext()

> `static` **extractEvaluationContext**(`context`): [`JsonObject`](../type-aliases/JsonObject.md)

Defined in: [types/context.ts:434](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/context.ts#L434)

Extract evaluation context

#### Parameters

##### context

[`BaseContext`](../type-aliases/BaseContext.md)

#### Returns

[`JsonObject`](../type-aliases/JsonObject.md)
