[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ServerAuthConfig

# Type Alias: ServerAuthConfig

> **ServerAuthConfig** = `object`

Defined in: [types/server.ts:962](https://github.com/juspay/neurolink/blob/release/src/lib/types/server.ts#L962)

Authentication configuration

## Properties

### strategy

> **strategy**: [`AuthStrategy`](AuthStrategy.md)

Defined in: [types/server.ts:963](https://github.com/juspay/neurolink/blob/release/src/lib/types/server.ts#L963)

---

### required?

> `optional` **required?**: `boolean`

Defined in: [types/server.ts:964](https://github.com/juspay/neurolink/blob/release/src/lib/types/server.ts#L964)

---

### headerName?

> `optional` **headerName?**: `string`

Defined in: [types/server.ts:965](https://github.com/juspay/neurolink/blob/release/src/lib/types/server.ts#L965)

---

### queryParam?

> `optional` **queryParam?**: `string`

Defined in: [types/server.ts:966](https://github.com/juspay/neurolink/blob/release/src/lib/types/server.ts#L966)

---

### validate?

> `optional` **validate?**: (`token`) => `Promise`\<[`AuthenticatedUser`](AuthenticatedUser.md) \| `null`\>

Defined in: [types/server.ts:967](https://github.com/juspay/neurolink/blob/release/src/lib/types/server.ts#L967)

#### Parameters

##### token

`string`

#### Returns

`Promise`\<[`AuthenticatedUser`](AuthenticatedUser.md) \| `null`\>

---

### roles?

> `optional` **roles?**: `string`[]

Defined in: [types/server.ts:968](https://github.com/juspay/neurolink/blob/release/src/lib/types/server.ts#L968)

---

### permissions?

> `optional` **permissions?**: `string`[]

Defined in: [types/server.ts:969](https://github.com/juspay/neurolink/blob/release/src/lib/types/server.ts#L969)
