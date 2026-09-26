[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / HippocampusLike

# Type Alias: HippocampusLike

> **HippocampusLike** = `object`

Subset of the @juspay/hippocampus client surface that NeuroLink core
actually calls. Defining this locally lets the initializer / SDK code
avoid a value or even a type import from the optional package.

## Properties

### add

> **add**: (`ownerId`, `content`, `options?`) => `Promise`\<`string`\>

#### Parameters

##### ownerId

`string`

##### content

`string`

##### options?

[`HippocampusAddOptions`](HippocampusAddOptions.md)

#### Returns

`Promise`\<`string`\>

---

### get

> **get**: (`ownerId`) => `Promise`\<`string` \| `null`\>

#### Parameters

##### ownerId

`string`

#### Returns

`Promise`\<`string` \| `null`\>

---

### delete

> **delete**: (`ownerId`) => `Promise`\<`void`\>

#### Parameters

##### ownerId

`string`

#### Returns

`Promise`\<`void`\>

---

### close

> **close**: () => `Promise`\<`void`\>

#### Returns

`Promise`\<`void`\>
