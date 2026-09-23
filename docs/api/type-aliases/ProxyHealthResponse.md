[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyHealthResponse

# Type Alias: ProxyHealthResponse

> **ProxyHealthResponse** = `object`

Defined in: [types/proxy.ts:2044](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2044)

Structured response returned by the proxy /health endpoint.

## Properties

### status

> **status**: `"ok"` \| `"starting"`

Defined in: [types/proxy.ts:2045](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2045)

---

### ready

> **ready**: `boolean`

Defined in: [types/proxy.ts:2046](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2046)

---

### acceptingConnections

> **acceptingConnections**: `boolean`

Defined in: [types/proxy.ts:2047](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2047)

---

### drainingForUpdate

> **drainingForUpdate**: `boolean`

Defined in: [types/proxy.ts:2048](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2048)

---

### strategy

> **strategy**: `string`

Defined in: [types/proxy.ts:2049](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2049)

---

### passthrough

> **passthrough**: `boolean`

Defined in: [types/proxy.ts:2050](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2050)

---

### version

> **version**: `string`

Defined in: [types/proxy.ts:2051](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2051)

---

### startedAt

> **startedAt**: `string`

Defined in: [types/proxy.ts:2052](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2052)

---

### readyAt

> **readyAt**: `string` \| `null`

Defined in: [types/proxy.ts:2053](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2053)

---

### uptime

> **uptime**: `number`

Defined in: [types/proxy.ts:2054](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2054)

---

### healthPath

> **healthPath**: `"/health"`

Defined in: [types/proxy.ts:2055](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2055)

---

### statusPath

> **statusPath**: `"/status"`

Defined in: [types/proxy.ts:2056](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2056)
