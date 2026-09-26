[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CliAccountsResponse

# Type Alias: CliAccountsResponse

> **CliAccountsResponse** = `object`

Response body of GET /accounts.

## Properties

### generatedAt

> **generatedAt**: `number`

---

### usageDate

> **usageDate**: `string`

UTC date whose request log the usage totals cover.

---

### quotaFromSnapshot

> **quotaFromSnapshot**: `boolean`

True when quota came from the stored snapshot rather than a live fetch.

---

### usageError

> **usageError**: `string` \| `null`

Set when the usage totals could not be read at all.

---

### quotaError

> **quotaError**: `string` \| `null`

Set when the quota snapshot could not be read; rows still carry status.

---

### costBasis

> **costBasis**: `"api-equivalent"`

---

### accounts

> **accounts**: [`CliAccountsRow`](CliAccountsRow.md)[]
