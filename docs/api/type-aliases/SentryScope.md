[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SentryScope

# Type Alias: SentryScope

> **SentryScope** = `object`

Defined in: [types/observability.ts:544](https://github.com/juspay/neurolink/blob/release/src/lib/types/observability.ts#L544)

Sentry scope surface used by SentryExporter.withScope callbacks.

## Properties

### setTags

> **setTags**: (`tags`) => `void`

Defined in: [types/observability.ts:545](https://github.com/juspay/neurolink/blob/release/src/lib/types/observability.ts#L545)

#### Parameters

##### tags

`Record`\<`string`, `string`\>

#### Returns

`void`

---

### setContext

> **setContext**: (`name`, `context`) => `void`

Defined in: [types/observability.ts:546](https://github.com/juspay/neurolink/blob/release/src/lib/types/observability.ts#L546)

#### Parameters

##### name

`string`

##### context

`Record`\<`string`, `unknown`\>

#### Returns

`void`

---

### setUser

> **setUser**: (`user`) => `void`

Defined in: [types/observability.ts:547](https://github.com/juspay/neurolink/blob/release/src/lib/types/observability.ts#L547)

#### Parameters

##### user

###### id

`string`

#### Returns

`void`
