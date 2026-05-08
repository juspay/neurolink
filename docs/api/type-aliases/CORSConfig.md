[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / CORSConfig

# Type Alias: CORSConfig

> **CORSConfig** = `object`

Defined in: [types/server.ts:84](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L84)

CORS configuration

## Properties

### enabled?

> `optional` **enabled?**: `boolean`

Defined in: [types/server.ts:86](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L86)

Enable CORS (default: true)

---

### origins?

> `optional` **origins?**: `string`[]

Defined in: [types/server.ts:89](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L89)

Allowed origins (default: ["*"])

---

### methods?

> `optional` **methods?**: `string`[]

Defined in: [types/server.ts:92](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L92)

Allowed HTTP methods

---

### headers?

> `optional` **headers?**: `string`[]

Defined in: [types/server.ts:95](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L95)

Allowed headers

---

### credentials?

> `optional` **credentials?**: `boolean`

Defined in: [types/server.ts:98](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L98)

Allow credentials

---

### maxAge?

> `optional` **maxAge?**: `number`

Defined in: [types/server.ts:101](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L101)

Preflight cache max age in seconds
