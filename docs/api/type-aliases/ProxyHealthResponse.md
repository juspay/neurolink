[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyHealthResponse

# Type Alias: ProxyHealthResponse

> **ProxyHealthResponse** = `object`

Defined in: [types/proxy.ts:1973](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1973)

Structured response returned by the proxy /health endpoint.

## Properties

### status

> **status**: `"ok"` \| `"starting"`

Defined in: [types/proxy.ts:1974](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1974)

---

### ready

> **ready**: `boolean`

Defined in: [types/proxy.ts:1975](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1975)

---

### acceptingConnections

> **acceptingConnections**: `boolean`

Defined in: [types/proxy.ts:1976](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1976)

---

### drainingForUpdate

> **drainingForUpdate**: `boolean`

Defined in: [types/proxy.ts:1977](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1977)

---

### strategy

> **strategy**: `string`

Defined in: [types/proxy.ts:1978](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1978)

---

### passthrough

> **passthrough**: `boolean`

Defined in: [types/proxy.ts:1979](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1979)

---

### version

> **version**: `string`

Defined in: [types/proxy.ts:1980](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1980)

---

### startedAt

> **startedAt**: `string`

Defined in: [types/proxy.ts:1981](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1981)

---

### readyAt

> **readyAt**: `string` \| `null`

Defined in: [types/proxy.ts:1982](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1982)

---

### uptime

> **uptime**: `number`

Defined in: [types/proxy.ts:1983](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1983)

---

### healthPath

> **healthPath**: `"/health"`

Defined in: [types/proxy.ts:1984](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1984)

---

### statusPath

> **statusPath**: `"/status"`

Defined in: [types/proxy.ts:1985](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1985)
