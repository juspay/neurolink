[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ServerStatus

# Type Alias: ServerStatus

> **ServerStatus** = `object`

Server status information

## Properties

### running

> **running**: `boolean`

Whether server is running

---

### port

> **port**: `number`

Server port

---

### host

> **host**: `string`

Server host

---

### uptime

> **uptime**: `number`

Server uptime in milliseconds

---

### routes

> **routes**: `number`

Number of registered routes

---

### middlewares

> **middlewares**: `number`

Number of registered middleware

---

### lifecycleState?

> `optional` **lifecycleState?**: [`ServerLifecycleState`](ServerLifecycleState.md)

Current lifecycle state

---

### activeConnections?

> `optional` **activeConnections?**: `number`

Number of active connections
