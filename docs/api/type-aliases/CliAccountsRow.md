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

Defined in: [types/proxyClient.ts:154](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L154)

Bare label, e.g. "someone@example.com". Display only: two rows can share
it when one email is logged in to both engines. `key` is the identity.

---

### key

> **key**: `string` \| `null`

Defined in: [types/proxyClient.ts:159](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L159)

Full pool key, e.g. "anthropic:someone@example.com" or
"codex:someone@example.com". Null only for plumbing rows.

---

### provider?

> `optional` **provider?**: `"anthropic"` \| `"codex"`

Defined in: [types/proxyClient.ts:164](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L164)

Which pool engine owns this login. Absent on plumbing rows. Consumers
that key a list by row must key by `key`, not `label` — see above.

---

### kind

> **kind**: `"account"` \| `"internal"` \| `"translation"`

Defined in: [types/proxyClient.ts:170](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L170)

What this row actually is. Only "account" rows are real logins; the proxy
also tracks internal and translation pseudo-accounts, which have no quota
and should not be rendered as credentials.

---

### type

> **type**: `string`

Defined in: [types/proxyClient.ts:171](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L171)

---

### status

> **status**: `string` \| `null`

Defined in: [types/proxyClient.ts:172](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L172)

---

### cooling

> **cooling**: `boolean`

Defined in: [types/proxyClient.ts:173](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L173)

---

### allowed

> **allowed**: `boolean` \| `null`

Defined in: [types/proxyClient.ts:174](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L174)

---

### expired

> **expired**: `boolean` \| `null`

Defined in: [types/proxyClient.ts:175](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L175)

---

### isPrimary

> **isPrimary**: `boolean`

Defined in: [types/proxyClient.ts:176](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L176)

---

### requests

> **requests**: `number` \| `null`

Defined in: [types/proxyClient.ts:177](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L177)

---

### errors

> **errors**: `number` \| `null`

Defined in: [types/proxyClient.ts:178](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L178)

---

### rateLimits

> **rateLimits**: `number` \| `null`

Defined in: [types/proxyClient.ts:179](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L179)

---

### quotaRateLimits

> **quotaRateLimits**: `number` \| `null`

Defined in: [types/proxyClient.ts:180](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L180)

---

### quota

> **quota**: [`JsonObject`](JsonObject.md) \| `null`

Defined in: [types/proxyClient.ts:182](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L182)

Quota block from the limits snapshot, timestamps normalised to ms.

---

### usage

> **usage**: [`CliAccountUsageTotals`](CliAccountUsageTotals.md) \| `null`

Defined in: [types/proxyClient.ts:184](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L184)

Today's usage from the request log, or null when the log is unreadable.
