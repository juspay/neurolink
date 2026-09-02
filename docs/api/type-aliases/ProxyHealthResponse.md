[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyHealthResponse

# Type Alias: ProxyHealthResponse

> **ProxyHealthResponse** = `object`

Defined in: [types/proxy.ts:1669](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1669)

Structured response returned by the proxy /health endpoint.

## Properties

### status

> **status**: `"ok"` \| `"starting"`

Defined in: [types/proxy.ts:1670](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1670)

---

### ready

> **ready**: `boolean`

Defined in: [types/proxy.ts:1671](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1671)

---

### acceptingConnections

> **acceptingConnections**: `boolean`

Defined in: [types/proxy.ts:1672](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1672)

---

### drainingForUpdate

> **drainingForUpdate**: `boolean`

Defined in: [types/proxy.ts:1673](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1673)

---

### strategy

> **strategy**: `string`

Defined in: [types/proxy.ts:1674](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1674)

---

### passthrough

> **passthrough**: `boolean`

Defined in: [types/proxy.ts:1675](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1675)

---

### version

> **version**: `string`

Defined in: [types/proxy.ts:1676](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1676)

---

### startedAt

> **startedAt**: `string`

Defined in: [types/proxy.ts:1677](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1677)

---

### readyAt

> **readyAt**: `string` \| `null`

Defined in: [types/proxy.ts:1678](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1678)

---

### uptime

> **uptime**: `number`

Defined in: [types/proxy.ts:1679](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1679)

---

### healthPath

> **healthPath**: `"/health"`

Defined in: [types/proxy.ts:1680](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1680)

---

### statusPath

> **statusPath**: `"/status"`

Defined in: [types/proxy.ts:1681](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1681)
