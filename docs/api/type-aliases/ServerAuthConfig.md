[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ServerAuthConfig

# Type Alias: ServerAuthConfig

> **ServerAuthConfig** = `object`

Authentication configuration

## Properties

### strategy

> **strategy**: [`AuthStrategy`](AuthStrategy.md)

---

### required?

> `optional` **required?**: `boolean`

---

### headerName?

> `optional` **headerName?**: `string`

---

### queryParam?

> `optional` **queryParam?**: `string`

---

### validate?

> `optional` **validate?**: (`token`) => `Promise`\<[`AuthenticatedUser`](AuthenticatedUser.md) \| `null`\>

#### Parameters

##### token

`string`

#### Returns

`Promise`\<[`AuthenticatedUser`](AuthenticatedUser.md) \| `null`\>

---

### roles?

> `optional` **roles?**: `string`[]

---

### permissions?

> `optional` **permissions?**: `string`[]
