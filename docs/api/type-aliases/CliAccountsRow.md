[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CliAccountsRow

# Type Alias: CliAccountsRow

> **CliAccountsRow** = `object`

Defined in: [types/proxyClient.ts:215](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L215)

One row of GET /accounts.

## Properties

### label

> **label**: `string`

Defined in: [types/proxyClient.ts:220](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L220)

Bare label, e.g. "someone@example.com". Display only: two rows can share
it when one email is logged in to both engines. `key` is the identity.

---

### key

> **key**: `string` \| `null`

Defined in: [types/proxyClient.ts:225](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L225)

Full pool key, e.g. "anthropic:someone@example.com" or
"codex:someone@example.com". Null only for plumbing rows.

---

### provider?

> `optional` **provider?**: `"anthropic"` \| `"codex"` \| `"vertex"`

Defined in: [types/proxyClient.ts:233](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L233)

Which pool engine owns this login. Absent on plumbing rows. Consumers
that key a list by row must key by `key`, not `label` — see above.

`"vertex"` is not a login: native fallback legs are keyed by served
model, with no OAuth account behind them, so they carry no token state.

---

### kind

> **kind**: `"account"` \| `"internal"` \| `"translation"`

Defined in: [types/proxyClient.ts:239](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L239)

What this row actually is. Only "account" rows are real logins; the proxy
also tracks internal and translation pseudo-accounts, which have no quota
and should not be rendered as credentials.

---

### type

> **type**: `string`

Defined in: [types/proxyClient.ts:240](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L240)

---

### status

> **status**: `string` \| `null`

Defined in: [types/proxyClient.ts:241](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L241)

---

### cooling

> **cooling**: `boolean`

Defined in: [types/proxyClient.ts:242](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L242)

---

### allowed

> **allowed**: `boolean` \| `null`

Defined in: [types/proxyClient.ts:243](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L243)

---

### expired

> **expired**: `boolean` \| `null`

Defined in: [types/proxyClient.ts:244](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L244)

---

### isPrimary

> **isPrimary**: `boolean`

Defined in: [types/proxyClient.ts:245](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L245)

---

### requests

> **requests**: `number` \| `null`

Defined in: [types/proxyClient.ts:246](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L246)

---

### errors

> **errors**: `number` \| `null`

Defined in: [types/proxyClient.ts:247](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L247)

---

### rateLimits

> **rateLimits**: `number` \| `null`

Defined in: [types/proxyClient.ts:248](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L248)

---

### quotaRateLimits

> **quotaRateLimits**: `number` \| `null`

Defined in: [types/proxyClient.ts:249](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L249)

---

### quota

> **quota**: [`JsonObject`](JsonObject.md) \| `null`

Defined in: [types/proxyClient.ts:251](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L251)

Quota block from the limits snapshot, timestamps normalised to ms.

---

### usage

> **usage**: [`CliAccountUsageTotals`](CliAccountUsageTotals.md) \| `null`

Defined in: [types/proxyClient.ts:253](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L253)

Today's usage from the request log, or null when the log is unreadable.
