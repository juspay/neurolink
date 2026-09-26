[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / createErrorFactory

# Function: createErrorFactory()

> **createErrorFactory**\<`TCodes`\>(`feature`, `codes`): `object`

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
