[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyLedgerEntry

# Type Alias: ProxyLedgerEntry

> **ProxyLedgerEntry** = `object`

Defined in: [types/proxyClient.ts:272](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L272)

One request as recorded in the proxy request log, reduced to what costing needs.

## Properties

### account

> **account**: `string`

Defined in: [types/proxyClient.ts:273](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L273)

---

### accountKey

> **accountKey**: `string`

Defined in: [types/proxyClient.ts:280](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L280)

Provider-qualified identity, "anthropic:<label>" or "codex:<label>".
Read from the log row when present; derived from `accountType` for rows
written before the pool logged it. This, not `account`, is the join key:
one email can be logged in to both engines.

---

### clientApp

> **clientApp**: `string`

Defined in: [types/proxyClient.ts:282](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L282)

Derived calling CLI; see CliAccountUsageTotals.byClient.

---

### accountType

> **accountType**: `string`

Defined in: [types/proxyClient.ts:283](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L283)

---

### model

> **model**: `string`

Defined in: [types/proxyClient.ts:284](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L284)

---

### provider?

> `optional` **provider?**: `string`

Defined in: [types/proxyClient.ts:285](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L285)

---

### inputTokens

> **inputTokens**: `number`

Defined in: [types/proxyClient.ts:286](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L286)

---

### outputTokens

> **outputTokens**: `number`

Defined in: [types/proxyClient.ts:287](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L287)

---

### cacheReadTokens

> **cacheReadTokens**: `number`

Defined in: [types/proxyClient.ts:288](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L288)

---

### cacheCreationTokens

> **cacheCreationTokens**: `number`

Defined in: [types/proxyClient.ts:289](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L289)
