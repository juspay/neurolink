[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CliAccountsResponse

# Type Alias: CliAccountsResponse

> **CliAccountsResponse** = `object`

Defined in: [types/proxyClient.ts:128](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L128)

Response body of GET /accounts.

## Properties

### generatedAt

> **generatedAt**: `number`

Defined in: [types/proxyClient.ts:129](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L129)

---

### usageDate

> **usageDate**: `string`

Defined in: [types/proxyClient.ts:131](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L131)

UTC date whose request log the usage totals cover.

---

### quotaFromSnapshot

> **quotaFromSnapshot**: `boolean`

Defined in: [types/proxyClient.ts:133](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L133)

True when quota came from the stored snapshot rather than a live fetch.

---

### usageError

> **usageError**: `string` \| `null`

Defined in: [types/proxyClient.ts:135](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L135)

Set when the usage totals could not be read at all.

---

### quotaError

> **quotaError**: `string` \| `null`

Defined in: [types/proxyClient.ts:137](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L137)

Set when the quota snapshot could not be read; rows still carry status.

---

### costBasis

> **costBasis**: `"api-equivalent"`

Defined in: [types/proxyClient.ts:138](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L138)

---

### accounts

> **accounts**: [`CliAccountsRow`](CliAccountsRow.md)[]

Defined in: [types/proxyClient.ts:139](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L139)
