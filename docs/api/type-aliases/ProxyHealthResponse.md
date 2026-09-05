[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyHealthResponse

# Type Alias: ProxyHealthResponse

> **ProxyHealthResponse** = `object`

Defined in: [types/proxy.ts:1681](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1681)

Structured response returned by the proxy /health endpoint.

## Properties

### status

> **status**: `"ok"` \| `"starting"`

Defined in: [types/proxy.ts:1682](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1682)

---

### ready

> **ready**: `boolean`

Defined in: [types/proxy.ts:1683](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1683)

---

### acceptingConnections

> **acceptingConnections**: `boolean`

Defined in: [types/proxy.ts:1684](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1684)

---

### drainingForUpdate

> **drainingForUpdate**: `boolean`

Defined in: [types/proxy.ts:1685](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1685)

---

### strategy

> **strategy**: `string`

Defined in: [types/proxy.ts:1686](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1686)

---

### passthrough

> **passthrough**: `boolean`

Defined in: [types/proxy.ts:1687](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1687)

---

### version

> **version**: `string`

Defined in: [types/proxy.ts:1688](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1688)

---

### startedAt

> **startedAt**: `string`

Defined in: [types/proxy.ts:1689](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1689)

---

### readyAt

> **readyAt**: `string` \| `null`

Defined in: [types/proxy.ts:1690](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1690)

---

### uptime

> **uptime**: `number`

Defined in: [types/proxy.ts:1691](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1691)

---

### healthPath

> **healthPath**: `"/health"`

Defined in: [types/proxy.ts:1692](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1692)

---

### statusPath

> **statusPath**: `"/status"`

Defined in: [types/proxy.ts:1693](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1693)
