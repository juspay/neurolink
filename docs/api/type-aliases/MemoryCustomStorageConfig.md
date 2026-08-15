[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / MemoryCustomStorageConfig

# Type Alias: MemoryCustomStorageConfig

> **MemoryCustomStorageConfig** = `object`

Defined in: [types/memory.ts:45](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/memory.ts#L45)

## Properties

### type

> **type**: `"custom"`

Defined in: [types/memory.ts:46](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/memory.ts#L46)

---

### onGet

> **onGet**: (`ownerId`) => `Promise`\<`string` \| `null`\>

Defined in: [types/memory.ts:47](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/memory.ts#L47)

#### Parameters

##### ownerId

`string`

#### Returns

`Promise`\<`string` \| `null`\>

---

### onSet

> **onSet**: (`ownerId`, `memory`) => `Promise`\<`void`\>

Defined in: [types/memory.ts:48](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/memory.ts#L48)

#### Parameters

##### ownerId

`string`

##### memory

`string`

#### Returns

`Promise`\<`void`\>

---

### onDelete

> **onDelete**: (`ownerId`) => `Promise`\<`void`\>

Defined in: [types/memory.ts:49](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/memory.ts#L49)

#### Parameters

##### ownerId

`string`

#### Returns

`Promise`\<`void`\>

---

### onClose?

> `optional` **onClose?**: () => `Promise`\<`void`\>

Defined in: [types/memory.ts:50](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/memory.ts#L50)

#### Returns

`Promise`\<`void`\>
