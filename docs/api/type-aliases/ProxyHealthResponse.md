[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyHealthResponse

# Type Alias: ProxyHealthResponse

> **ProxyHealthResponse** = `object`

Defined in: [types/proxy.ts:2136](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2136)

Structured response returned by the proxy /health endpoint.

## Properties

### status

> **status**: `"ok"` \| `"starting"`

Defined in: [types/proxy.ts:2137](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2137)

---

### ready

> **ready**: `boolean`

Defined in: [types/proxy.ts:2138](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2138)

---

### acceptingConnections

> **acceptingConnections**: `boolean`

Defined in: [types/proxy.ts:2139](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2139)

---

### drainingForUpdate

> **drainingForUpdate**: `boolean`

Defined in: [types/proxy.ts:2140](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2140)

---

### strategy

> **strategy**: `string`

Defined in: [types/proxy.ts:2141](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2141)

---

### passthrough

> **passthrough**: `boolean`

Defined in: [types/proxy.ts:2142](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2142)

---

### version

> **version**: `string`

Defined in: [types/proxy.ts:2143](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2143)

---

### startedAt

> **startedAt**: `string`

Defined in: [types/proxy.ts:2144](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2144)

---

### readyAt

> **readyAt**: `string` \| `null`

Defined in: [types/proxy.ts:2145](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2145)

---

### uptime

> **uptime**: `number`

Defined in: [types/proxy.ts:2146](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2146)

---

### healthPath

> **healthPath**: `"/health"`

Defined in: [types/proxy.ts:2147](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2147)

---

### statusPath

> **statusPath**: `"/status"`

Defined in: [types/proxy.ts:2148](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2148)
