[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyHealthResponse

# Type Alias: ProxyHealthResponse

> **ProxyHealthResponse** = `object`

Defined in: [types/proxy.ts:1868](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1868)

Structured response returned by the proxy /health endpoint.

## Properties

### status

> **status**: `"ok"` \| `"starting"`

Defined in: [types/proxy.ts:1869](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1869)

---

### ready

> **ready**: `boolean`

Defined in: [types/proxy.ts:1870](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1870)

---

### acceptingConnections

> **acceptingConnections**: `boolean`

Defined in: [types/proxy.ts:1871](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1871)

---

### drainingForUpdate

> **drainingForUpdate**: `boolean`

Defined in: [types/proxy.ts:1872](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1872)

---

### strategy

> **strategy**: `string`

Defined in: [types/proxy.ts:1873](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1873)

---

### passthrough

> **passthrough**: `boolean`

Defined in: [types/proxy.ts:1874](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1874)

---

### version

> **version**: `string`

Defined in: [types/proxy.ts:1875](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1875)

---

### startedAt

> **startedAt**: `string`

Defined in: [types/proxy.ts:1876](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1876)

---

### readyAt

> **readyAt**: `string` \| `null`

Defined in: [types/proxy.ts:1877](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1877)

---

### uptime

> **uptime**: `number`

Defined in: [types/proxy.ts:1878](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1878)

---

### healthPath

> **healthPath**: `"/health"`

Defined in: [types/proxy.ts:1879](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1879)

---

### statusPath

> **statusPath**: `"/status"`

Defined in: [types/proxy.ts:1880](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1880)
