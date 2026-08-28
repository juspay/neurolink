[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CliAccountsResponse

# Type Alias: CliAccountsResponse

> **CliAccountsResponse** = `object`

Defined in: [types/proxyClient.ts:177](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L177)

Response body of GET /accounts.

## Properties

### generatedAt

> **generatedAt**: `number`

Defined in: [types/proxyClient.ts:178](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L178)

---

### usageDate

> **usageDate**: `string`

Defined in: [types/proxyClient.ts:180](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L180)

UTC date whose request log the usage totals cover.

---

### quotaFromSnapshot

> **quotaFromSnapshot**: `boolean`

Defined in: [types/proxyClient.ts:182](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L182)

True when quota came from the stored snapshot rather than a live fetch.

---

### usageError

> **usageError**: `string` \| `null`

Defined in: [types/proxyClient.ts:184](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L184)

Set when the usage totals could not be read at all.

---

### quotaError

> **quotaError**: `string` \| `null`

Defined in: [types/proxyClient.ts:186](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L186)

Set when the quota snapshot could not be read; rows still carry status.

---

### costBasis

> **costBasis**: `"api-equivalent"`

Defined in: [types/proxyClient.ts:187](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L187)

---

### accounts

> **accounts**: [`CliAccountsRow`](CliAccountsRow.md)[]

Defined in: [types/proxyClient.ts:188](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L188)
