[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProviderErrorRule

# Type Alias: ProviderErrorRule

> **ProviderErrorRule** = `object`

Defined in: [types/errors.ts:106](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/errors.ts#L106)

One row of a provider's error-classification table. Rules are tried in
array order; the first `match` to return true wins. `errorClass` must be
`ProviderError` or one of its subclasses (AuthenticationError,
RateLimitError, InvalidModelError, NetworkError, ...) sharing its
`(message, provider?)` constructor shape. `message` can be a static
string or a function of the context, for providers that need to
interpolate a model name, a scraped retry-delay, or an AWS error code.

## Properties

### match

> **match**: (`ctx`) => `boolean`

Defined in: [types/errors.ts:107](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/errors.ts#L107)

#### Parameters

##### ctx

[`ProviderErrorContext`](ProviderErrorContext.md)

#### Returns

`boolean`

---

### errorClass

> **errorClass**: (`message`, `provider?`) => [`ProviderError`](../classes/ProviderError.md)

Defined in: [types/errors.ts:108](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/errors.ts#L108)

#### Parameters

##### message

`string`

##### provider?

`string`

#### Returns

[`ProviderError`](../classes/ProviderError.md)

---

### message

> **message**: `string` \| ((`ctx`) => `string`)

Defined in: [types/errors.ts:109](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/errors.ts#L109)
