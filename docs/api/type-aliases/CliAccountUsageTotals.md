[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CliAccountUsageTotals

# Type Alias: CliAccountUsageTotals

> **CliAccountUsageTotals** = `object`

Defined in: [types/proxyClient.ts:101](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L101)

Per-account token and cost totals derived from the proxy's own request log.

`costUsd` is an **API-equivalent** figure: what the recorded tokens would
have cost at published per-token rates. Pooled OAuth accounts are billed by
subscription, so this is a value estimate, never an invoice. Consumers must
label it as such.

## Properties

### requests

> **requests**: `number`

Defined in: [types/proxyClient.ts:102](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L102)

---

### inputTokens

> **inputTokens**: `number`

Defined in: [types/proxyClient.ts:103](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L103)

---

### outputTokens

> **outputTokens**: `number`

Defined in: [types/proxyClient.ts:104](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L104)

---

### cacheReadTokens

> **cacheReadTokens**: `number`

Defined in: [types/proxyClient.ts:105](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L105)

---

### cacheCreationTokens

> **cacheCreationTokens**: `number`

Defined in: [types/proxyClient.ts:106](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L106)

---

### costUsd

> **costUsd**: `number`

Defined in: [types/proxyClient.ts:107](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L107)

---

### unpricedRequests

> **unpricedRequests**: `number`

Defined in: [types/proxyClient.ts:109](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L109)

Requests whose model carried no pricing row, so contributed no cost.

---

### unpricedModels

> **unpricedModels**: `string`[]

Defined in: [types/proxyClient.ts:111](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L111)

Distinct models with no pricing row, so an operator can chase them.

---

### byClient

> **byClient**: `Record`\<`string`, [`CliClientUsageTotals`](CliClientUsageTotals.md)\>

Defined in: [types/proxyClient.ts:118](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L118)

Same totals split by calling CLI, keyed by the derived client name.

Empty for traffic logged before attribution existed — those rows carry no
User-Agent, and guessing one retroactively would invent history.
