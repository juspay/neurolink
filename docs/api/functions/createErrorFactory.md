[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / createErrorFactory

# Function: createErrorFactory()

> **createErrorFactory**\<`TCodes`\>(`feature`, `codes`): `object`

Defined in: [core/infrastructure/baseError.ts:30](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/core/infrastructure/baseError.ts#L30)

## Type Parameters

### TCodes

`TCodes` _extends_ `Record`\<`string`, `string`\>

## Parameters

### feature

`string`

### codes

`TCodes`

## Returns

`object`

### codes

> **codes**: `TCodes`

### create

> **create**: (`code`, `message`, `options?`) => [`NeuroLinkFeatureError`](../classes/NeuroLinkFeatureError.md)

#### Parameters

##### code

keyof `TCodes`

##### message

`string`

##### options?

###### retryable?

`boolean`

###### details?

`Record`\<`string`, `unknown`\>

###### cause?

`Error`

#### Returns

[`NeuroLinkFeatureError`](../classes/NeuroLinkFeatureError.md)
