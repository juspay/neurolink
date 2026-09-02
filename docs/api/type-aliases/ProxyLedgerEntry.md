[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyLedgerEntry

# Type Alias: ProxyLedgerEntry

> **ProxyLedgerEntry** = `object`

Defined in: [types/proxyClient.ts:203](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L203)

One request as recorded in the proxy request log, reduced to what costing needs.

## Properties

### account

> **account**: `string`

Defined in: [types/proxyClient.ts:204](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L204)

---

### accountKey

> **accountKey**: `string`

Defined in: [types/proxyClient.ts:211](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L211)

Provider-qualified identity, "anthropic:<label>" or "codex:<label>".
Read from the log row when present; derived from `accountType` for rows
written before the pool logged it. This, not `account`, is the join key:
one email can be logged in to both engines.

---

### clientApp

> **clientApp**: `string`

Defined in: [types/proxyClient.ts:213](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L213)

Derived calling CLI; see CliAccountUsageTotals.byClient.

---

### accountType

> **accountType**: `string`

Defined in: [types/proxyClient.ts:214](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L214)

---

### model

> **model**: `string`

Defined in: [types/proxyClient.ts:215](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L215)

---

### provider?

> `optional` **provider?**: `string`

Defined in: [types/proxyClient.ts:216](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L216)

---

### inputTokens

> **inputTokens**: `number`

Defined in: [types/proxyClient.ts:217](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L217)

---

### outputTokens

> **outputTokens**: `number`

Defined in: [types/proxyClient.ts:218](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L218)

---

### cacheReadTokens

> **cacheReadTokens**: `number`

Defined in: [types/proxyClient.ts:219](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L219)

---

### cacheCreationTokens

> **cacheCreationTokens**: `number`

Defined in: [types/proxyClient.ts:220](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L220)
