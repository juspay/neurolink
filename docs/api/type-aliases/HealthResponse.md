[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / HealthResponse

# Type Alias: HealthResponse

> **HealthResponse** = `object`

Defined in: [types/server.ts:756](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/server.ts#L756)

Health check response

## Properties

### status

> **status**: `"ok"` \| `"degraded"` \| `"unhealthy"`

Defined in: [types/server.ts:758](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/server.ts#L758)

Health status

---

### timestamp

> **timestamp**: `string`

Defined in: [types/server.ts:761](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/server.ts#L761)

Timestamp

---

### uptime

> **uptime**: `number`

Defined in: [types/server.ts:764](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/server.ts#L764)

Server uptime in milliseconds

---

### version

> **version**: `string`

Defined in: [types/server.ts:767](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/server.ts#L767)

Version information
