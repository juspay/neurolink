[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyHealthResponse

# Type Alias: ProxyHealthResponse

> **ProxyHealthResponse** = `object`

Defined in: [types/proxy.ts:1875](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1875)

Structured response returned by the proxy /health endpoint.

## Properties

### status

> **status**: `"ok"` \| `"starting"`

Defined in: [types/proxy.ts:1876](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1876)

---

### ready

> **ready**: `boolean`

Defined in: [types/proxy.ts:1877](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1877)

---

### acceptingConnections

> **acceptingConnections**: `boolean`

Defined in: [types/proxy.ts:1878](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1878)

---

### drainingForUpdate

> **drainingForUpdate**: `boolean`

Defined in: [types/proxy.ts:1879](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1879)

---

### strategy

> **strategy**: `string`

Defined in: [types/proxy.ts:1880](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1880)

---

### passthrough

> **passthrough**: `boolean`

Defined in: [types/proxy.ts:1881](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1881)

---

### version

> **version**: `string`

Defined in: [types/proxy.ts:1882](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1882)

---

### startedAt

> **startedAt**: `string`

Defined in: [types/proxy.ts:1883](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1883)

---

### readyAt

> **readyAt**: `string` \| `null`

Defined in: [types/proxy.ts:1884](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1884)

---

### uptime

> **uptime**: `number`

Defined in: [types/proxy.ts:1885](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1885)

---

### healthPath

> **healthPath**: `"/health"`

Defined in: [types/proxy.ts:1886](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1886)

---

### statusPath

> **statusPath**: `"/status"`

Defined in: [types/proxy.ts:1887](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1887)
