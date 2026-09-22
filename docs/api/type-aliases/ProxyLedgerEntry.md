[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyLedgerEntry

# Type Alias: ProxyLedgerEntry

> **ProxyLedgerEntry** = `object`

Defined in: [types/proxyClient.ts:245](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L245)

One request as recorded in the proxy request log, reduced to what costing needs.

## Properties

### account

> **account**: `string`

Defined in: [types/proxyClient.ts:246](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L246)

---

### accountKey

> **accountKey**: `string`

Defined in: [types/proxyClient.ts:253](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L253)

Provider-qualified identity, "anthropic:<label>" or "codex:<label>".
Read from the log row when present; derived from `accountType` for rows
written before the pool logged it. This, not `account`, is the join key:
one email can be logged in to both engines.

---

### clientApp

> **clientApp**: `string`

Defined in: [types/proxyClient.ts:255](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L255)

Derived calling CLI; see CliAccountUsageTotals.byClient.

---

### accountType

> **accountType**: `string`

Defined in: [types/proxyClient.ts:256](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L256)

---

### model

> **model**: `string`

Defined in: [types/proxyClient.ts:257](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L257)

---

### provider?

> `optional` **provider?**: `string`

Defined in: [types/proxyClient.ts:258](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L258)

---

### inputTokens

> **inputTokens**: `number`

Defined in: [types/proxyClient.ts:259](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L259)

---

### outputTokens

> **outputTokens**: `number`

Defined in: [types/proxyClient.ts:260](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L260)

---

### cacheReadTokens

> **cacheReadTokens**: `number`

Defined in: [types/proxyClient.ts:261](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L261)

---

### cacheCreationTokens

> **cacheCreationTokens**: `number`

Defined in: [types/proxyClient.ts:262](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L262)
