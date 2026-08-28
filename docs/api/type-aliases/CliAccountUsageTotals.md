[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CliAccountUsageTotals

# Type Alias: CliAccountUsageTotals

> **CliAccountUsageTotals** = `object`

Defined in: [types/proxyClient.ts:118](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L118)

Per-account token and cost totals derived from the proxy's own request log.

`costUsd` is an **API-equivalent** figure: what the recorded tokens would
have cost at published per-token rates. Pooled OAuth accounts are billed by
subscription, so this is a value estimate, never an invoice. Consumers must
label it as such.

## Properties

### requests

> **requests**: `number`

Defined in: [types/proxyClient.ts:119](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L119)

---

### inputTokens

> **inputTokens**: `number`

Defined in: [types/proxyClient.ts:120](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L120)

---

### outputTokens

> **outputTokens**: `number`

Defined in: [types/proxyClient.ts:121](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L121)

---

### cacheReadTokens

> **cacheReadTokens**: `number`

Defined in: [types/proxyClient.ts:122](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L122)

---

### cacheCreationTokens

> **cacheCreationTokens**: `number`

Defined in: [types/proxyClient.ts:123](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L123)

---

### costUsd

> **costUsd**: `number`

Defined in: [types/proxyClient.ts:124](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L124)

---

### unpricedRequests

> **unpricedRequests**: `number`

Defined in: [types/proxyClient.ts:126](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L126)

Requests whose model carried no pricing row, so contributed no cost.

---

### unpricedModels

> **unpricedModels**: `string`[]

Defined in: [types/proxyClient.ts:128](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L128)

Distinct models with no pricing row, so an operator can chase them.

---

### byClient

> **byClient**: `Record`\<`string`, [`CliClientUsageTotals`](CliClientUsageTotals.md)\>

Defined in: [types/proxyClient.ts:135](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L135)

Same totals split by calling CLI, keyed by the derived client name.

Empty for traffic logged before attribution existed — those rows carry no
User-Agent, and guessing one retroactively would invent history.
