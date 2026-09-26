[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CliAccountUsageTotals

# Type Alias: CliAccountUsageTotals

> **CliAccountUsageTotals** = `object`

Per-account token and cost totals derived from the proxy's own request log.

`costUsd` is an **API-equivalent** figure: what the recorded tokens would
have cost at published per-token rates. Pooled OAuth accounts are billed by
subscription, so this is a value estimate, never an invoice. Consumers must
label it as such.

## Properties

### requests

> **requests**: `number`

---

### inputTokens

> **inputTokens**: `number`

---

### outputTokens

> **outputTokens**: `number`

---

### cacheReadTokens

> **cacheReadTokens**: `number`

---

### cacheCreationTokens

> **cacheCreationTokens**: `number`

---

### costUsd

> **costUsd**: `number`

---

### unpricedRequests

> **unpricedRequests**: `number`

Requests whose model carried no pricing row, so contributed no cost.

---

### unpricedModels

> **unpricedModels**: `string`[]

Distinct models with no pricing row, so an operator can chase them.

---

### byClient

> **byClient**: `Record`\<`string`, [`CliClientUsageTotals`](CliClientUsageTotals.md)\>

Same totals split by calling CLI, keyed by the derived client name.

Empty for traffic logged before attribution existed — those rows carry no
User-Agent, and guessing one retroactively would invent history.
