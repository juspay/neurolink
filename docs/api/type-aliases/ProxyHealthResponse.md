[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyHealthResponse

# Type Alias: ProxyHealthResponse

> **ProxyHealthResponse** = `object`

Defined in: [types/proxy.ts:1638](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1638)

Structured response returned by the proxy /health endpoint.

## Properties

### status

> **status**: `"ok"` \| `"starting"`

Defined in: [types/proxy.ts:1639](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1639)

---

### ready

> **ready**: `boolean`

Defined in: [types/proxy.ts:1640](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1640)

---

### acceptingConnections

> **acceptingConnections**: `boolean`

Defined in: [types/proxy.ts:1641](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1641)

---

### drainingForUpdate

> **drainingForUpdate**: `boolean`

Defined in: [types/proxy.ts:1642](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1642)

---

### strategy

> **strategy**: `string`

Defined in: [types/proxy.ts:1643](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1643)

---

### passthrough

> **passthrough**: `boolean`

Defined in: [types/proxy.ts:1644](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1644)

---

### version

> **version**: `string`

Defined in: [types/proxy.ts:1645](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1645)

---

### startedAt

> **startedAt**: `string`

Defined in: [types/proxy.ts:1646](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1646)

---

### readyAt

> **readyAt**: `string` \| `null`

Defined in: [types/proxy.ts:1647](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1647)

---

### uptime

> **uptime**: `number`

Defined in: [types/proxy.ts:1648](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1648)

---

### healthPath

> **healthPath**: `"/health"`

Defined in: [types/proxy.ts:1649](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1649)

---

### statusPath

> **statusPath**: `"/status"`

Defined in: [types/proxy.ts:1650](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1650)
