[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyHealthResponse

# Type Alias: ProxyHealthResponse

> **ProxyHealthResponse** = `object`

Structured response returned by the proxy /health endpoint.

## Properties

### status

> **status**: `"ok"` \| `"starting"`

---

### ready

> **ready**: `boolean`

---

### acceptingConnections

> **acceptingConnections**: `boolean`

---

### drainingForUpdate

> **drainingForUpdate**: `boolean`

---

### strategy

> **strategy**: `string`

---

### passthrough

> **passthrough**: `boolean`

---

### version

> **version**: `string`

---

### startedAt

> **startedAt**: `string`

---

### readyAt

> **readyAt**: `string` \| `null`

---

### uptime

> **uptime**: `number`

---

### healthPath

> **healthPath**: `"/health"`

---

### statusPath

> **statusPath**: `"/status"`
