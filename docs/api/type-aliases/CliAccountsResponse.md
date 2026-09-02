[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CliAccountsResponse

# Type Alias: CliAccountsResponse

> **CliAccountsResponse** = `object`

Defined in: [types/proxyClient.ts:188](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L188)

Response body of GET /accounts.

## Properties

### generatedAt

> **generatedAt**: `number`

Defined in: [types/proxyClient.ts:189](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L189)

---

### usageDate

> **usageDate**: `string`

Defined in: [types/proxyClient.ts:191](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L191)

UTC date whose request log the usage totals cover.

---

### quotaFromSnapshot

> **quotaFromSnapshot**: `boolean`

Defined in: [types/proxyClient.ts:193](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L193)

True when quota came from the stored snapshot rather than a live fetch.

---

### usageError

> **usageError**: `string` \| `null`

Defined in: [types/proxyClient.ts:195](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L195)

Set when the usage totals could not be read at all.

---

### quotaError

> **quotaError**: `string` \| `null`

Defined in: [types/proxyClient.ts:197](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L197)

Set when the quota snapshot could not be read; rows still carry status.

---

### costBasis

> **costBasis**: `"api-equivalent"`

Defined in: [types/proxyClient.ts:198](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L198)

---

### accounts

> **accounts**: [`CliAccountsRow`](CliAccountsRow.md)[]

Defined in: [types/proxyClient.ts:199](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L199)
