[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyHealthResponse

# Type Alias: ProxyHealthResponse

> **ProxyHealthResponse** = `object`

Defined in: [types/proxy.ts:2047](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2047)

Structured response returned by the proxy /health endpoint.

## Properties

### status

> **status**: `"ok"` \| `"starting"`

Defined in: [types/proxy.ts:2048](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2048)

---

### ready

> **ready**: `boolean`

Defined in: [types/proxy.ts:2049](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2049)

---

### acceptingConnections

> **acceptingConnections**: `boolean`

Defined in: [types/proxy.ts:2050](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2050)

---

### drainingForUpdate

> **drainingForUpdate**: `boolean`

Defined in: [types/proxy.ts:2051](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2051)

---

### strategy

> **strategy**: `string`

Defined in: [types/proxy.ts:2052](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2052)

---

### passthrough

> **passthrough**: `boolean`

Defined in: [types/proxy.ts:2053](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2053)

---

### version

> **version**: `string`

Defined in: [types/proxy.ts:2054](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2054)

---

### startedAt

> **startedAt**: `string`

Defined in: [types/proxy.ts:2055](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2055)

---

### readyAt

> **readyAt**: `string` \| `null`

Defined in: [types/proxy.ts:2056](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2056)

---

### uptime

> **uptime**: `number`

Defined in: [types/proxy.ts:2057](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2057)

---

### healthPath

> **healthPath**: `"/health"`

Defined in: [types/proxy.ts:2058](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2058)

---

### statusPath

> **statusPath**: `"/status"`

Defined in: [types/proxy.ts:2059](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2059)
