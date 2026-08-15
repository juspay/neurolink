[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / HippocampusLike

# Type Alias: HippocampusLike

> **HippocampusLike** = `object`

Defined in: [types/memory.ts:87](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/memory.ts#L87)

Subset of the @juspay/hippocampus client surface that NeuroLink core
actually calls. Defining this locally lets the initializer / SDK code
avoid a value or even a type import from the optional package.

## Properties

### add

> **add**: (`ownerId`, `content`, `options?`) => `Promise`\<`string`\>

Defined in: [types/memory.ts:88](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/memory.ts#L88)

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

Defined in: [types/memory.ts:93](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/memory.ts#L93)

#### Parameters

##### ownerId

`string`

#### Returns

`Promise`\<`string` \| `null`\>

---

### delete

> **delete**: (`ownerId`) => `Promise`\<`void`\>

Defined in: [types/memory.ts:94](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/memory.ts#L94)

#### Parameters

##### ownerId

`string`

#### Returns

`Promise`\<`void`\>

---

### close

> **close**: () => `Promise`\<`void`\>

Defined in: [types/memory.ts:95](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/memory.ts#L95)

#### Returns

`Promise`\<`void`\>
