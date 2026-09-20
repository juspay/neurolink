[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ContextFactory

# Class: ContextFactory

Defined in: [types/context.ts:100](https://github.com/juspay/neurolink/blob/release/src/lib/types/context.ts#L100)

Factory for context processing

## Constructors

### Constructor

> **new ContextFactory**(): `ContextFactory`

#### Returns

`ContextFactory`

## Properties

### DEFAULT_FRAMEWORK_FIELDS

> `readonly` `static` **DEFAULT_FRAMEWORK_FIELDS**: [`FrameworkFieldsConfig`](../type-aliases/FrameworkFieldsConfig.md)

Defined in: [types/context.ts:104](https://github.com/juspay/neurolink/blob/release/src/lib/types/context.ts#L104)

Default framework fields configuration

---

### DEFAULT_CONFIG

> `readonly` `static` **DEFAULT_CONFIG**: [`ContextConfig`](../type-aliases/ContextConfig.md)

Defined in: [types/context.ts:235](https://github.com/juspay/neurolink/blob/release/src/lib/types/context.ts#L235)

Default context configuration

## Methods

### configureFrameworkFields()

> `static` **configureFrameworkFields**(`config`): `void`

Defined in: [types/context.ts:139](https://github.com/juspay/neurolink/blob/release/src/lib/types/context.ts#L139)

Configure framework fields for exclusion from custom data

#### Parameters

##### config

`Partial`\<[`FrameworkFieldsConfig`](../type-aliases/FrameworkFieldsConfig.md)\>

#### Returns

`void`

---

### getFrameworkFieldsConfig()

> `static` **getFrameworkFieldsConfig**(): [`FrameworkFieldsConfig`](../type-aliases/FrameworkFieldsConfig.md)

Defined in: [types/context.ts:153](https://github.com/juspay/neurolink/blob/release/src/lib/types/context.ts#L153)

Get current framework fields configuration
Ensures lazy initialization if not already loaded

#### Returns

[`FrameworkFieldsConfig`](../type-aliases/FrameworkFieldsConfig.md)

---

### resetFrameworkFieldsConfig()

> `static` **resetFrameworkFieldsConfig**(): `void`

Defined in: [types/context.ts:165](https://github.com/juspay/neurolink/blob/release/src/lib/types/context.ts#L165)

Reset framework fields configuration to default

#### Returns

`void`

---

### loadFrameworkFieldsFromEnv()

> `static` **loadFrameworkFieldsFromEnv**(): `void`

Defined in: [types/context.ts:175](https://github.com/juspay/neurolink/blob/release/src/lib/types/context.ts#L175)

Load framework fields configuration from environment variables
Supports NEUROLINK_CONTEXT_EXCLUDE_FIELDS and NEUROLINK_CONTEXT_INCLUDE_FIELDS

#### Returns

`void`

---

### addFrameworkFieldsToExclude()

> `static` **addFrameworkFieldsToExclude**(`fields`): `void`

Defined in: [types/context.ts:215](https://github.com/juspay/neurolink/blob/release/src/lib/types/context.ts#L215)

Add additional fields to exclude

#### Parameters

##### fields

`string`[]

#### Returns

`void`

---

### addFrameworkFieldsToInclude()

> `static` **addFrameworkFieldsToInclude**(`fields`): `void`

Defined in: [types/context.ts:225](https://github.com/juspay/neurolink/blob/release/src/lib/types/context.ts#L225)

Add fields to include (override exclusion)

#### Parameters

##### fields

`string`[]

#### Returns

`void`

---

### validateContext()

> `static` **validateContext**(`context`): [`BaseContext`](../type-aliases/BaseContext.md) \| `null`

Defined in: [types/context.ts:246](https://github.com/juspay/neurolink/blob/release/src/lib/types/context.ts#L246)

Validate and normalize context data

#### Parameters

##### context

`unknown`

#### Returns

[`BaseContext`](../type-aliases/BaseContext.md) \| `null`

---

### processContext()

> `static` **processContext**(`context`, `config?`): `ProcessedContext`

Defined in: [types/context.ts:270](https://github.com/juspay/neurolink/blob/release/src/lib/types/context.ts#L270)

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

Defined in: [types/context.ts:421](https://github.com/juspay/neurolink/blob/release/src/lib/types/context.ts#L421)

Extract analytics data from context

#### Parameters

##### context

[`BaseContext`](../type-aliases/BaseContext.md)

#### Returns

[`JsonObject`](../type-aliases/JsonObject.md)

---

### extractEvaluationContext()

> `static` **extractEvaluationContext**(`context`): [`JsonObject`](../type-aliases/JsonObject.md)

Defined in: [types/context.ts:435](https://github.com/juspay/neurolink/blob/release/src/lib/types/context.ts#L435)

Extract evaluation context

#### Parameters

##### context

[`BaseContext`](../type-aliases/BaseContext.md)

#### Returns

[`JsonObject`](../type-aliases/JsonObject.md)
