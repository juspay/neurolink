[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / AuthHealthCheck

# Type Alias: AuthHealthCheck

> **AuthHealthCheck** = `object`

Defined in: [types/auth.ts:988](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/auth.ts#L988)

Auth health check result

## Properties

### healthy

> **healthy**: `boolean`

Defined in: [types/auth.ts:990](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/auth.ts#L990)

Overall health status

---

### providerConnected

> **providerConnected**: `boolean`

Defined in: [types/auth.ts:992](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/auth.ts#L992)

Provider connection status

---

### sessionStorageHealthy

> **sessionStorageHealthy**: `boolean`

Defined in: [types/auth.ts:994](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/auth.ts#L994)

Session storage status

---

### lastSuccessfulAuth?

> `optional` **lastSuccessfulAuth?**: `Date`

Defined in: [types/auth.ts:996](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/auth.ts#L996)

Last successful authentication

---

### error?

> `optional` **error?**: `string`

Defined in: [types/auth.ts:998](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/auth.ts#L998)

Error details if unhealthy
