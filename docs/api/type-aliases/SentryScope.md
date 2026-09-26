[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SentryScope

# Type Alias: SentryScope

> **SentryScope** = `object`

Sentry scope surface used by SentryExporter.withScope callbacks.

## Properties

### setTags

> **setTags**: (`tags`) => `void`

#### Parameters

##### tags

`Record`\<`string`, `string`\>

#### Returns

`void`

---

### setContext

> **setContext**: (`name`, `context`) => `void`

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

#### Parameters

##### user

###### id

`string`

#### Returns

`void`
