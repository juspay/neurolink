[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyHealthResponse

# Type Alias: ProxyHealthResponse

> **ProxyHealthResponse** = `object`

Defined in: [types/proxy.ts:1660](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1660)

Structured response returned by the proxy /health endpoint.

## Properties

### status

> **status**: `"ok"` \| `"starting"`

Defined in: [types/proxy.ts:1661](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1661)

---

### ready

> **ready**: `boolean`

Defined in: [types/proxy.ts:1662](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1662)

---

### acceptingConnections

> **acceptingConnections**: `boolean`

Defined in: [types/proxy.ts:1663](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1663)

---

### drainingForUpdate

> **drainingForUpdate**: `boolean`

Defined in: [types/proxy.ts:1664](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1664)

---

### strategy

> **strategy**: `string`

Defined in: [types/proxy.ts:1665](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1665)

---

### passthrough

> **passthrough**: `boolean`

Defined in: [types/proxy.ts:1666](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1666)

---

### version

> **version**: `string`

Defined in: [types/proxy.ts:1667](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1667)

---

### startedAt

> **startedAt**: `string`

Defined in: [types/proxy.ts:1668](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1668)

---

### readyAt

> **readyAt**: `string` \| `null`

Defined in: [types/proxy.ts:1669](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1669)

---

### uptime

> **uptime**: `number`

Defined in: [types/proxy.ts:1670](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1670)

---

### healthPath

> **healthPath**: `"/health"`

Defined in: [types/proxy.ts:1671](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1671)

---

### statusPath

> **statusPath**: `"/status"`

Defined in: [types/proxy.ts:1672](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1672)
