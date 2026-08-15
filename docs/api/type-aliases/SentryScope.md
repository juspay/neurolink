[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / SentryScope

# Type Alias: SentryScope

> **SentryScope** = `object`

Defined in: [types/observability.ts:544](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/observability.ts#L544)

Sentry scope surface used by SentryExporter.withScope callbacks.

## Properties

### setTags

> **setTags**: (`tags`) => `void`

Defined in: [types/observability.ts:545](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/observability.ts#L545)

#### Parameters

##### tags

`Record`\<`string`, `string`\>

#### Returns

`void`

---

### setContext

> **setContext**: (`name`, `context`) => `void`

Defined in: [types/observability.ts:546](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/observability.ts#L546)

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

Defined in: [types/observability.ts:547](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/observability.ts#L547)

#### Parameters

##### user

###### id

`string`

#### Returns

`void`
