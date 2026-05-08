[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / ParameterNormalizer

# Class: ParameterNormalizer

Defined in: [types/universalProviderOptions.ts:96](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/universalProviderOptions.ts#L96)

Parameter normalization utilities
Converts between different parameter formats for backward compatibility

## Constructors

### Constructor

> **new ParameterNormalizer**(): `ParameterNormalizer`

#### Returns

`ParameterNormalizer`

## Methods

### normalizeToUniversal()

> `static` **normalizeToUniversal**(`optionsOrPrompt`): [`UniversalProviderOptions`](../type-aliases/UniversalProviderOptions.md)

Defined in: [types/universalProviderOptions.ts:100](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/universalProviderOptions.ts#L100)

Normalize legacy parameter formats to universal format

#### Parameters

##### optionsOrPrompt

`string` \| [`UniversalProviderOptions`](../type-aliases/UniversalProviderOptions.md)

#### Returns

[`UniversalProviderOptions`](../type-aliases/UniversalProviderOptions.md)

---

### extractProviderOptions()

> `static` **extractProviderOptions**\<`T`\>(`options`, `providerType`): `T` \| [`GenericProviderOptions`](../type-aliases/GenericProviderOptions.md)

Defined in: [types/universalProviderOptions.ts:121](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/universalProviderOptions.ts#L121)

Extract provider-specific parameters safely

#### Type Parameters

##### T

`T` _extends_ [`ProviderSpecificOptions`](../type-aliases/ProviderSpecificOptions.md)

#### Parameters

##### options

[`UniversalProviderOptions`](../type-aliases/UniversalProviderOptions.md) \| [`ProviderSpecificOptions`](../type-aliases/ProviderSpecificOptions.md)

##### providerType

`T`\[`"providerType"`\]

#### Returns

`T` \| [`GenericProviderOptions`](../type-aliases/GenericProviderOptions.md)

---

### mergeWithDefaults()

> `static` **mergeWithDefaults**(`options`, `defaults`): [`UniversalProviderOptions`](../type-aliases/UniversalProviderOptions.md)

Defined in: [types/universalProviderOptions.ts:143](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/universalProviderOptions.ts#L143)

Merge default values with user-provided options

#### Parameters

##### options

[`UniversalProviderOptions`](../type-aliases/UniversalProviderOptions.md)

##### defaults

`Partial`\<[`UniversalProviderOptions`](../type-aliases/UniversalProviderOptions.md)\>

#### Returns

[`UniversalProviderOptions`](../type-aliases/UniversalProviderOptions.md)
