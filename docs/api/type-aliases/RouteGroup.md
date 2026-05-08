[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / RouteGroup

# Type Alias: RouteGroup

> **RouteGroup** = `object`

Defined in: [types/server.ts:443](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L443)

Route group for organizing related routes

## Properties

### prefix

> **prefix**: `string`

Defined in: [types/server.ts:445](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L445)

Group prefix

---

### routes

> **routes**: [`RouteDefinition`](RouteDefinition.md)[]

Defined in: [types/server.ts:448](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L448)

Routes in this group

---

### middleware?

> `optional` **middleware?**: [`MiddlewareDefinition`](MiddlewareDefinition.md)[]

Defined in: [types/server.ts:451](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L451)

Middleware specific to this group

---

### auth?

> `optional` **auth?**: `boolean`

Defined in: [types/server.ts:454](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L454)

Group-level authentication

---

### roles?

> `optional` **roles?**: `string`[]

Defined in: [types/server.ts:457](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L457)

Group-level roles
