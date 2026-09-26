[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CliAccountsResponse

# Type Alias: CliAccountsResponse

> **CliAccountsResponse** = `object`

Defined in: [types/proxyClient.ts:257](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L257)

Response body of GET /accounts.

## Properties

### generatedAt

> **generatedAt**: `number`

Defined in: [types/proxyClient.ts:258](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L258)

---

### usageDate

> **usageDate**: `string`

Defined in: [types/proxyClient.ts:260](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L260)

UTC date whose request log the usage totals cover.

---

### quotaFromSnapshot

> **quotaFromSnapshot**: `boolean`

Defined in: [types/proxyClient.ts:262](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L262)

True when quota came from the stored snapshot rather than a live fetch.

---

### usageError

> **usageError**: `string` \| `null`

Defined in: [types/proxyClient.ts:264](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L264)

Set when the usage totals could not be read at all.

---

### quotaError

> **quotaError**: `string` \| `null`

Defined in: [types/proxyClient.ts:266](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L266)

Set when the quota snapshot could not be read; rows still carry status.

---

### costBasis

> **costBasis**: `"api-equivalent"`

Defined in: [types/proxyClient.ts:267](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L267)

---

### accounts

> **accounts**: [`CliAccountsRow`](CliAccountsRow.md)[]

Defined in: [types/proxyClient.ts:268](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L268)
