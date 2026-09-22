[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CliAccountsRow

# Type Alias: CliAccountsRow

> **CliAccountsRow** = `object`

Defined in: [types/proxyClient.ts:188](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L188)

One row of GET /accounts.

## Properties

### label

> **label**: `string`

Defined in: [types/proxyClient.ts:193](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L193)

Bare label, e.g. "someone@example.com". Display only: two rows can share
it when one email is logged in to both engines. `key` is the identity.

---

### key

> **key**: `string` \| `null`

Defined in: [types/proxyClient.ts:198](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L198)

Full pool key, e.g. "anthropic:someone@example.com" or
"codex:someone@example.com". Null only for plumbing rows.

---

### provider?

> `optional` **provider?**: `"anthropic"` \| `"codex"` \| `"vertex"`

Defined in: [types/proxyClient.ts:206](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L206)

Which pool engine owns this login. Absent on plumbing rows. Consumers
that key a list by row must key by `key`, not `label` — see above.

`"vertex"` is not a login: native fallback legs are keyed by served
model, with no OAuth account behind them, so they carry no token state.

---

### kind

> **kind**: `"account"` \| `"internal"` \| `"translation"`

Defined in: [types/proxyClient.ts:212](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L212)

What this row actually is. Only "account" rows are real logins; the proxy
also tracks internal and translation pseudo-accounts, which have no quota
and should not be rendered as credentials.

---

### type

> **type**: `string`

Defined in: [types/proxyClient.ts:213](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L213)

---

### status

> **status**: `string` \| `null`

Defined in: [types/proxyClient.ts:214](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L214)

---

### cooling

> **cooling**: `boolean`

Defined in: [types/proxyClient.ts:215](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L215)

---

### allowed

> **allowed**: `boolean` \| `null`

Defined in: [types/proxyClient.ts:216](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L216)

---

### expired

> **expired**: `boolean` \| `null`

Defined in: [types/proxyClient.ts:217](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L217)

---

### isPrimary

> **isPrimary**: `boolean`

Defined in: [types/proxyClient.ts:218](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L218)

---

### requests

> **requests**: `number` \| `null`

Defined in: [types/proxyClient.ts:219](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L219)

---

### errors

> **errors**: `number` \| `null`

Defined in: [types/proxyClient.ts:220](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L220)

---

### rateLimits

> **rateLimits**: `number` \| `null`

Defined in: [types/proxyClient.ts:221](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L221)

---

### quotaRateLimits

> **quotaRateLimits**: `number` \| `null`

Defined in: [types/proxyClient.ts:222](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L222)

---

### quota

> **quota**: [`JsonObject`](JsonObject.md) \| `null`

Defined in: [types/proxyClient.ts:224](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L224)

Quota block from the limits snapshot, timestamps normalised to ms.

---

### usage

> **usage**: [`CliAccountUsageTotals`](CliAccountUsageTotals.md) \| `null`

Defined in: [types/proxyClient.ts:226](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L226)

Today's usage from the request log, or null when the log is unreadable.
