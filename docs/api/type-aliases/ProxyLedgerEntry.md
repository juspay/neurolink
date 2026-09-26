[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyLedgerEntry

# Type Alias: ProxyLedgerEntry

> **ProxyLedgerEntry** = `object`

One request as recorded in the proxy request log, reduced to what costing needs.

## Properties

### account

> **account**: `string`

---

### accountKey

> **accountKey**: `string`

Provider-qualified identity, "anthropic:<label>" or "codex:<label>".
Read from the log row when present; derived from `accountType` for rows
written before the pool logged it. This, not `account`, is the join key:
one email can be logged in to both engines.

---

### clientApp

> **clientApp**: `string`

Derived calling CLI; see CliAccountUsageTotals.byClient.

---

### accountType

> **accountType**: `string`

---

### model

> **model**: `string`

---

### provider?

> `optional` **provider?**: `string`

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
