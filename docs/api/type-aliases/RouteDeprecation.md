[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RouteDeprecation

# Type Alias: RouteDeprecation

> **RouteDeprecation** = `object`

Defined in: [types/server.ts:375](https://github.com/juspay/neurolink/blob/release/src/lib/types/server.ts#L375)

Route deprecation information

## Properties

### enabled

> **enabled**: `boolean`

Defined in: [types/server.ts:377](https://github.com/juspay/neurolink/blob/release/src/lib/types/server.ts#L377)

Whether the route is deprecated

---

### since?

> `optional` **since?**: `string`

Defined in: [types/server.ts:380](https://github.com/juspay/neurolink/blob/release/src/lib/types/server.ts#L380)

Version when deprecated

---

### removeIn?

> `optional` **removeIn?**: `string`

Defined in: [types/server.ts:383](https://github.com/juspay/neurolink/blob/release/src/lib/types/server.ts#L383)

Version when route will be removed

---

### alternative?

> `optional` **alternative?**: `string`

Defined in: [types/server.ts:386](https://github.com/juspay/neurolink/blob/release/src/lib/types/server.ts#L386)

Alternative route to use

---

### message?

> `optional` **message?**: `string`

Defined in: [types/server.ts:389](https://github.com/juspay/neurolink/blob/release/src/lib/types/server.ts#L389)

Deprecation message
