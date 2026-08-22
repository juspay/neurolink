[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / CliAccountUsageTotals

# Type Alias: CliAccountUsageTotals

> **CliAccountUsageTotals** = `object`

Defined in: [types/proxyClient.ts:69](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/proxyClient.ts#L69)

Per-account token and cost totals derived from the proxy's own request log.

`costUsd` is an **API-equivalent** figure: what the recorded tokens would
have cost at published per-token rates. Pooled OAuth accounts are billed by
subscription, so this is a value estimate, never an invoice. Consumers must
label it as such.

## Properties

### requests

> **requests**: `number`

Defined in: [types/proxyClient.ts:70](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/proxyClient.ts#L70)

---

### inputTokens

> **inputTokens**: `number`

Defined in: [types/proxyClient.ts:71](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/proxyClient.ts#L71)

---

### outputTokens

> **outputTokens**: `number`

Defined in: [types/proxyClient.ts:72](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/proxyClient.ts#L72)

---

### cacheReadTokens

> **cacheReadTokens**: `number`

Defined in: [types/proxyClient.ts:73](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/proxyClient.ts#L73)

---

### cacheCreationTokens

> **cacheCreationTokens**: `number`

Defined in: [types/proxyClient.ts:74](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/proxyClient.ts#L74)

---

### costUsd

> **costUsd**: `number`

Defined in: [types/proxyClient.ts:75](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/proxyClient.ts#L75)

---

### unpricedRequests

> **unpricedRequests**: `number`

Defined in: [types/proxyClient.ts:77](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/proxyClient.ts#L77)

Requests whose model carried no pricing row, so contributed no cost.

---

### unpricedModels

> **unpricedModels**: `string`[]

Defined in: [types/proxyClient.ts:79](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/proxyClient.ts#L79)

Distinct models with no pricing row, so an operator can chase them.

---

### byClient

> **byClient**: `Record`\<`string`, [`CliClientUsageTotals`](CliClientUsageTotals.md)\>

Defined in: [types/proxyClient.ts:86](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/proxyClient.ts#L86)

Same totals split by calling CLI, keyed by the derived client name.

Empty for traffic logged before attribution existed — those rows carry no
User-Agent, and guessing one retroactively would invent history.
