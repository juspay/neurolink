[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / ServerStatus

# Type Alias: ServerStatus

> **ServerStatus** = `object`

Defined in: [types/server.ts:814](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L814)

Server status information

## Properties

### running

> **running**: `boolean`

Defined in: [types/server.ts:816](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L816)

Whether server is running

---

### port

> **port**: `number`

Defined in: [types/server.ts:819](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L819)

Server port

---

### host

> **host**: `string`

Defined in: [types/server.ts:822](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L822)

Server host

---

### uptime

> **uptime**: `number`

Defined in: [types/server.ts:825](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L825)

Server uptime in milliseconds

---

### routes

> **routes**: `number`

Defined in: [types/server.ts:828](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L828)

Number of registered routes

---

### middlewares

> **middlewares**: `number`

Defined in: [types/server.ts:831](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L831)

Number of registered middleware

---

### lifecycleState?

> `optional` **lifecycleState?**: [`ServerLifecycleState`](ServerLifecycleState.md)

Defined in: [types/server.ts:834](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L834)

Current lifecycle state

---

### activeConnections?

> `optional` **activeConnections?**: `number`

Defined in: [types/server.ts:837](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L837)

Number of active connections
