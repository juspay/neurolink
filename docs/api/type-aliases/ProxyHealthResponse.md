[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyHealthResponse

# Type Alias: ProxyHealthResponse

> **ProxyHealthResponse** = `object`

Defined in: [types/proxy.ts:1675](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1675)

Structured response returned by the proxy /health endpoint.

## Properties

### status

> **status**: `"ok"` \| `"starting"`

Defined in: [types/proxy.ts:1676](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1676)

---

### ready

> **ready**: `boolean`

Defined in: [types/proxy.ts:1677](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1677)

---

### acceptingConnections

> **acceptingConnections**: `boolean`

Defined in: [types/proxy.ts:1678](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1678)

---

### drainingForUpdate

> **drainingForUpdate**: `boolean`

Defined in: [types/proxy.ts:1679](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1679)

---

### strategy

> **strategy**: `string`

Defined in: [types/proxy.ts:1680](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1680)

---

### passthrough

> **passthrough**: `boolean`

Defined in: [types/proxy.ts:1681](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1681)

---

### version

> **version**: `string`

Defined in: [types/proxy.ts:1682](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1682)

---

### startedAt

> **startedAt**: `string`

Defined in: [types/proxy.ts:1683](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1683)

---

### readyAt

> **readyAt**: `string` \| `null`

Defined in: [types/proxy.ts:1684](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1684)

---

### uptime

> **uptime**: `number`

Defined in: [types/proxy.ts:1685](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1685)

---

### healthPath

> **healthPath**: `"/health"`

Defined in: [types/proxy.ts:1686](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1686)

---

### statusPath

> **statusPath**: `"/status"`

Defined in: [types/proxy.ts:1687](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1687)
