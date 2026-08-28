[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CliAccountsResponse

# Type Alias: CliAccountsResponse

> **CliAccountsResponse** = `object`

Defined in: [types/proxyClient.ts:160](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L160)

Response body of GET /accounts.

## Properties

### generatedAt

> **generatedAt**: `number`

Defined in: [types/proxyClient.ts:161](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L161)

---

### usageDate

> **usageDate**: `string`

Defined in: [types/proxyClient.ts:163](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L163)

UTC date whose request log the usage totals cover.

---

### quotaFromSnapshot

> **quotaFromSnapshot**: `boolean`

Defined in: [types/proxyClient.ts:165](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L165)

True when quota came from the stored snapshot rather than a live fetch.

---

### usageError

> **usageError**: `string` \| `null`

Defined in: [types/proxyClient.ts:167](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L167)

Set when the usage totals could not be read at all.

---

### quotaError

> **quotaError**: `string` \| `null`

Defined in: [types/proxyClient.ts:169](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L169)

Set when the quota snapshot could not be read; rows still carry status.

---

### costBasis

> **costBasis**: `"api-equivalent"`

Defined in: [types/proxyClient.ts:170](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L170)

---

### accounts

> **accounts**: [`CliAccountsRow`](CliAccountsRow.md)[]

Defined in: [types/proxyClient.ts:171](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L171)
