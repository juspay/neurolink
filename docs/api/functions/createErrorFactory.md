[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / createErrorFactory

# Function: createErrorFactory()

> **createErrorFactory**\<`TCodes`\>(`feature`, `codes`): `object`

Defined in: [core/infrastructure/baseError.ts:30](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/core/infrastructure/baseError.ts#L30)

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
