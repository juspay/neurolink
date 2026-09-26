[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyHealthResponse

# Type Alias: ProxyHealthResponse

> **ProxyHealthResponse** = `object`

Defined in: [types/proxy.ts:2114](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2114)

Structured response returned by the proxy /health endpoint.

## Properties

### status

> **status**: `"ok"` \| `"starting"`

Defined in: [types/proxy.ts:2115](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2115)

---

### ready

> **ready**: `boolean`

Defined in: [types/proxy.ts:2116](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2116)

---

### acceptingConnections

> **acceptingConnections**: `boolean`

Defined in: [types/proxy.ts:2117](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2117)

---

### drainingForUpdate

> **drainingForUpdate**: `boolean`

Defined in: [types/proxy.ts:2118](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2118)

---

### strategy

> **strategy**: `string`

Defined in: [types/proxy.ts:2119](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2119)

---

### passthrough

> **passthrough**: `boolean`

Defined in: [types/proxy.ts:2120](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2120)

---

### version

> **version**: `string`

Defined in: [types/proxy.ts:2121](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2121)

---

### startedAt

> **startedAt**: `string`

Defined in: [types/proxy.ts:2122](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2122)

---

### readyAt

> **readyAt**: `string` \| `null`

Defined in: [types/proxy.ts:2123](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2123)

---

### uptime

> **uptime**: `number`

Defined in: [types/proxy.ts:2124](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2124)

---

### healthPath

> **healthPath**: `"/health"`

Defined in: [types/proxy.ts:2125](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2125)

---

### statusPath

> **statusPath**: `"/status"`

Defined in: [types/proxy.ts:2126](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2126)
