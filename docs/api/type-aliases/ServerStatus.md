[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / ServerStatus

# Type Alias: ServerStatus

> **ServerStatus** = `object`

Defined in: [types/server.ts:814](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/server.ts#L814)

Server status information

## Properties

### running

> **running**: `boolean`

Defined in: [types/server.ts:816](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/server.ts#L816)

Whether server is running

---

### port

> **port**: `number`

Defined in: [types/server.ts:819](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/server.ts#L819)

Server port

---

### host

> **host**: `string`

Defined in: [types/server.ts:822](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/server.ts#L822)

Server host

---

### uptime

> **uptime**: `number`

Defined in: [types/server.ts:825](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/server.ts#L825)

Server uptime in milliseconds

---

### routes

> **routes**: `number`

Defined in: [types/server.ts:828](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/server.ts#L828)

Number of registered routes

---

### middlewares

> **middlewares**: `number`

Defined in: [types/server.ts:831](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/server.ts#L831)

Number of registered middleware

---

### lifecycleState?

> `optional` **lifecycleState?**: [`ServerLifecycleState`](ServerLifecycleState.md)

Defined in: [types/server.ts:834](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/server.ts#L834)

Current lifecycle state

---

### activeConnections?

> `optional` **activeConnections?**: `number`

Defined in: [types/server.ts:837](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/server.ts#L837)

Number of active connections
