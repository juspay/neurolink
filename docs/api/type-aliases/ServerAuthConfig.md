[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / ServerAuthConfig

# Type Alias: ServerAuthConfig

> **ServerAuthConfig** = `object`

Defined in: [types/server.ts:953](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L953)

Authentication configuration

## Properties

### strategy

> **strategy**: [`AuthStrategy`](AuthStrategy.md)

Defined in: [types/server.ts:954](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L954)

---

### required?

> `optional` **required?**: `boolean`

Defined in: [types/server.ts:955](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L955)

---

### headerName?

> `optional` **headerName?**: `string`

Defined in: [types/server.ts:956](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L956)

---

### queryParam?

> `optional` **queryParam?**: `string`

Defined in: [types/server.ts:957](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L957)

---

### validate?

> `optional` **validate?**: (`token`) => `Promise`\<[`AuthenticatedUser`](AuthenticatedUser.md) \| `null`\>

Defined in: [types/server.ts:958](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L958)

#### Parameters

##### token

`string`

#### Returns

`Promise`\<[`AuthenticatedUser`](AuthenticatedUser.md) \| `null`\>

---

### roles?

> `optional` **roles?**: `string`[]

Defined in: [types/server.ts:959](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L959)

---

### permissions?

> `optional` **permissions?**: `string`[]

Defined in: [types/server.ts:960](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L960)
