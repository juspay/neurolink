[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CliAccountsRow

# Type Alias: CliAccountsRow

> **CliAccountsRow** = `object`

Defined in: [types/proxyClient.ts:149](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L149)

One row of GET /accounts.

## Properties

### label

> **label**: `string`

Defined in: [types/proxyClient.ts:151](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L151)

Bare label, e.g. "someone@example.com". The join key across all sources.

---

### key

> **key**: `string` \| `null`

Defined in: [types/proxyClient.ts:153](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L153)

Full pool key, e.g. "anthropic:someone@example.com".

---

### kind

> **kind**: `"account"` \| `"internal"` \| `"translation"`

Defined in: [types/proxyClient.ts:159](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L159)

What this row actually is. Only "account" rows are real logins; the proxy
also tracks internal and translation pseudo-accounts, which have no quota
and should not be rendered as credentials.

---

### type

> **type**: `string`

Defined in: [types/proxyClient.ts:160](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L160)

---

### status

> **status**: `string` \| `null`

Defined in: [types/proxyClient.ts:161](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L161)

---

### cooling

> **cooling**: `boolean`

Defined in: [types/proxyClient.ts:162](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L162)

---

### allowed

> **allowed**: `boolean` \| `null`

Defined in: [types/proxyClient.ts:163](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L163)

---

### expired

> **expired**: `boolean` \| `null`

Defined in: [types/proxyClient.ts:164](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L164)

---

### isPrimary

> **isPrimary**: `boolean`

Defined in: [types/proxyClient.ts:165](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L165)

---

### requests

> **requests**: `number` \| `null`

Defined in: [types/proxyClient.ts:166](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L166)

---

### errors

> **errors**: `number` \| `null`

Defined in: [types/proxyClient.ts:167](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L167)

---

### rateLimits

> **rateLimits**: `number` \| `null`

Defined in: [types/proxyClient.ts:168](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L168)

---

### quotaRateLimits

> **quotaRateLimits**: `number` \| `null`

Defined in: [types/proxyClient.ts:169](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L169)

---

### quota

> **quota**: [`JsonObject`](JsonObject.md) \| `null`

Defined in: [types/proxyClient.ts:171](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L171)

Quota block from the limits snapshot, timestamps normalised to ms.

---

### usage

> **usage**: [`CliAccountUsageTotals`](CliAccountUsageTotals.md) \| `null`

Defined in: [types/proxyClient.ts:173](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L173)

Today's usage from the request log, or null when the log is unreadable.
