[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / HealthResponse

# Type Alias: HealthResponse

> **HealthResponse** = `object`

Defined in: [types/server.ts:756](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L756)

Health check response

## Properties

### status

> **status**: `"ok"` \| `"degraded"` \| `"unhealthy"`

Defined in: [types/server.ts:758](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L758)

Health status

---

### timestamp

> **timestamp**: `string`

Defined in: [types/server.ts:761](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L761)

Timestamp

---

### uptime

> **uptime**: `number`

Defined in: [types/server.ts:764](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L764)

Server uptime in milliseconds

---

### version

> **version**: `string`

Defined in: [types/server.ts:767](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L767)

Version information
