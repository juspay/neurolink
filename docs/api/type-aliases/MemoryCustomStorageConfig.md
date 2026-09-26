[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / MemoryCustomStorageConfig

# Type Alias: MemoryCustomStorageConfig

> **MemoryCustomStorageConfig** = `object`

## Properties

### type

> **type**: `"custom"`

---

### onGet

> **onGet**: (`ownerId`) => `Promise`\<`string` \| `null`\>

#### Parameters

##### ownerId

`string`

#### Returns

`Promise`\<`string` \| `null`\>

---

### onSet

> **onSet**: (`ownerId`, `memory`) => `Promise`\<`void`\>

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

#### Parameters

##### ownerId

`string`

#### Returns

`Promise`\<`void`\>

---

### onClose?

> `optional` **onClose?**: () => `Promise`\<`void`\>

#### Returns

`Promise`\<`void`\>
