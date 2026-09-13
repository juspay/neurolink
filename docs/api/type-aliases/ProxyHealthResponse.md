[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyHealthResponse

# Type Alias: ProxyHealthResponse

> **ProxyHealthResponse** = `object`

Defined in: [types/proxy.ts:1771](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1771)

Structured response returned by the proxy /health endpoint.

## Properties

### status

> **status**: `"ok"` \| `"starting"`

Defined in: [types/proxy.ts:1772](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1772)

---

### ready

> **ready**: `boolean`

Defined in: [types/proxy.ts:1773](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1773)

---

### acceptingConnections

> **acceptingConnections**: `boolean`

Defined in: [types/proxy.ts:1774](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1774)

---

### drainingForUpdate

> **drainingForUpdate**: `boolean`

Defined in: [types/proxy.ts:1775](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1775)

---

### strategy

> **strategy**: `string`

Defined in: [types/proxy.ts:1776](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1776)

---

### passthrough

> **passthrough**: `boolean`

Defined in: [types/proxy.ts:1777](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1777)

---

### version

> **version**: `string`

Defined in: [types/proxy.ts:1778](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1778)

---

### startedAt

> **startedAt**: `string`

Defined in: [types/proxy.ts:1779](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1779)

---

### readyAt

> **readyAt**: `string` \| `null`

Defined in: [types/proxy.ts:1780](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1780)

---

### uptime

> **uptime**: `number`

Defined in: [types/proxy.ts:1781](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1781)

---

### healthPath

> **healthPath**: `"/health"`

Defined in: [types/proxy.ts:1782](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1782)

---

### statusPath

> **statusPath**: `"/status"`

Defined in: [types/proxy.ts:1783](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1783)
