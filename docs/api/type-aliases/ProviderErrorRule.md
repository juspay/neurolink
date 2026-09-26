[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProviderErrorRule

# Type Alias: ProviderErrorRule

> **ProviderErrorRule** = `object`

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

#### Parameters

##### ctx

[`ProviderErrorContext`](ProviderErrorContext.md)

#### Returns

`boolean`

---

### errorClass

> **errorClass**: (`message`, `provider?`) => [`ProviderError`](../classes/ProviderError.md)

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
