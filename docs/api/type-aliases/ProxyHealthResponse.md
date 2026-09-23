[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyHealthResponse

# Type Alias: ProxyHealthResponse

> **ProxyHealthResponse** = `object`

Defined in: [types/proxy.ts:2024](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2024)

Structured response returned by the proxy /health endpoint.

## Properties

### status

> **status**: `"ok"` \| `"starting"`

Defined in: [types/proxy.ts:2025](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2025)

---

### ready

> **ready**: `boolean`

Defined in: [types/proxy.ts:2026](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2026)

---

### acceptingConnections

> **acceptingConnections**: `boolean`

Defined in: [types/proxy.ts:2027](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2027)

---

### drainingForUpdate

> **drainingForUpdate**: `boolean`

Defined in: [types/proxy.ts:2028](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2028)

---

### strategy

> **strategy**: `string`

Defined in: [types/proxy.ts:2029](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2029)

---

### passthrough

> **passthrough**: `boolean`

Defined in: [types/proxy.ts:2030](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2030)

---

### version

> **version**: `string`

Defined in: [types/proxy.ts:2031](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2031)

---

### startedAt

> **startedAt**: `string`

Defined in: [types/proxy.ts:2032](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2032)

---

### readyAt

> **readyAt**: `string` \| `null`

Defined in: [types/proxy.ts:2033](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2033)

---

### uptime

> **uptime**: `number`

Defined in: [types/proxy.ts:2034](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2034)

---

### healthPath

> **healthPath**: `"/health"`

Defined in: [types/proxy.ts:2035](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2035)

---

### statusPath

> **statusPath**: `"/status"`

Defined in: [types/proxy.ts:2036](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2036)
