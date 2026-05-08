[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / RouteDeprecation

# Type Alias: RouteDeprecation

> **RouteDeprecation** = `object`

Defined in: [types/server.ts:375](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L375)

Route deprecation information

## Properties

### enabled

> **enabled**: `boolean`

Defined in: [types/server.ts:377](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L377)

Whether the route is deprecated

---

### since?

> `optional` **since?**: `string`

Defined in: [types/server.ts:380](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L380)

Version when deprecated

---

### removeIn?

> `optional` **removeIn?**: `string`

Defined in: [types/server.ts:383](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L383)

Version when route will be removed

---

### alternative?

> `optional` **alternative?**: `string`

Defined in: [types/server.ts:386](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L386)

Alternative route to use

---

### message?

> `optional` **message?**: `string`

Defined in: [types/server.ts:389](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L389)

Deprecation message
