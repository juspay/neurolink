[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CliAccountsRow

# Type Alias: CliAccountsRow

> **CliAccountsRow** = `object`

Defined in: [types/proxyClient.ts:132](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L132)

One row of GET /accounts.

## Properties

### label

> **label**: `string`

Defined in: [types/proxyClient.ts:134](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L134)

Bare label, e.g. "someone@example.com". The join key across all sources.

---

### key

> **key**: `string` \| `null`

Defined in: [types/proxyClient.ts:136](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L136)

Full pool key, e.g. "anthropic:someone@example.com".

---

### kind

> **kind**: `"account"` \| `"internal"` \| `"translation"`

Defined in: [types/proxyClient.ts:142](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L142)

What this row actually is. Only "account" rows are real logins; the proxy
also tracks internal and translation pseudo-accounts, which have no quota
and should not be rendered as credentials.

---

### type

> **type**: `string`

Defined in: [types/proxyClient.ts:143](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L143)

---

### status

> **status**: `string` \| `null`

Defined in: [types/proxyClient.ts:144](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L144)

---

### cooling

> **cooling**: `boolean`

Defined in: [types/proxyClient.ts:145](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L145)

---

### allowed

> **allowed**: `boolean` \| `null`

Defined in: [types/proxyClient.ts:146](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L146)

---

### expired

> **expired**: `boolean` \| `null`

Defined in: [types/proxyClient.ts:147](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L147)

---

### isPrimary

> **isPrimary**: `boolean`

Defined in: [types/proxyClient.ts:148](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L148)

---

### requests

> **requests**: `number` \| `null`

Defined in: [types/proxyClient.ts:149](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L149)

---

### errors

> **errors**: `number` \| `null`

Defined in: [types/proxyClient.ts:150](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L150)

---

### rateLimits

> **rateLimits**: `number` \| `null`

Defined in: [types/proxyClient.ts:151](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L151)

---

### quotaRateLimits

> **quotaRateLimits**: `number` \| `null`

Defined in: [types/proxyClient.ts:152](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L152)

---

### quota

> **quota**: [`JsonObject`](JsonObject.md) \| `null`

Defined in: [types/proxyClient.ts:154](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L154)

Quota block from the limits snapshot, timestamps normalised to ms.

---

### usage

> **usage**: [`CliAccountUsageTotals`](CliAccountUsageTotals.md) \| `null`

Defined in: [types/proxyClient.ts:156](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L156)

Today's usage from the request log, or null when the log is unreadable.
