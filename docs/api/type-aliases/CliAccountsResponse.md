[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CliAccountsResponse

# Type Alias: CliAccountsResponse

> **CliAccountsResponse** = `object`

Defined in: [types/proxyClient.ts:230](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L230)

Response body of GET /accounts.

## Properties

### generatedAt

> **generatedAt**: `number`

Defined in: [types/proxyClient.ts:231](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L231)

---

### usageDate

> **usageDate**: `string`

Defined in: [types/proxyClient.ts:233](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L233)

UTC date whose request log the usage totals cover.

---

### quotaFromSnapshot

> **quotaFromSnapshot**: `boolean`

Defined in: [types/proxyClient.ts:235](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L235)

True when quota came from the stored snapshot rather than a live fetch.

---

### usageError

> **usageError**: `string` \| `null`

Defined in: [types/proxyClient.ts:237](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L237)

Set when the usage totals could not be read at all.

---

### quotaError

> **quotaError**: `string` \| `null`

Defined in: [types/proxyClient.ts:239](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L239)

Set when the quota snapshot could not be read; rows still carry status.

---

### costBasis

> **costBasis**: `"api-equivalent"`

Defined in: [types/proxyClient.ts:240](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L240)

---

### accounts

> **accounts**: [`CliAccountsRow`](CliAccountsRow.md)[]

Defined in: [types/proxyClient.ts:241](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L241)
