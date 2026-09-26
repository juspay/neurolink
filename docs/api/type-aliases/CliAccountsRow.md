[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CliAccountsRow

# Type Alias: CliAccountsRow

> **CliAccountsRow** = `object`

One row of GET /accounts.

## Properties

### label

> **label**: `string`

Bare label, e.g. "someone@example.com". Display only: two rows can share
it when one email is logged in to both engines. `key` is the identity.

---

### key

> **key**: `string` \| `null`

Full pool key, e.g. "anthropic:someone@example.com" or
"codex:someone@example.com". Null only for plumbing rows.

---

### provider?

> `optional` **provider?**: `"anthropic"` \| `"codex"` \| `"vertex"`

Which pool engine owns this login. Absent on plumbing rows. Consumers
that key a list by row must key by `key`, not `label` — see above.

`"vertex"` is not a login: native fallback legs are keyed by served
model, with no OAuth account behind them, so they carry no token state.

---

### kind

> **kind**: `"account"` \| `"internal"` \| `"translation"`

What this row actually is. Only "account" rows are real logins; the proxy
also tracks internal and translation pseudo-accounts, which have no quota
and should not be rendered as credentials.

---

### type

> **type**: `string`

---

### status

> **status**: `string` \| `null`

---

### cooling

> **cooling**: `boolean`

---

### allowed

> **allowed**: `boolean` \| `null`

---

### expired

> **expired**: `boolean` \| `null`

---

### isPrimary

> **isPrimary**: `boolean`

---

### requests

> **requests**: `number` \| `null`

---

### errors

> **errors**: `number` \| `null`

---

### rateLimits

> **rateLimits**: `number` \| `null`

---

### quotaRateLimits

> **quotaRateLimits**: `number` \| `null`

---

### quota

> **quota**: [`JsonObject`](JsonObject.md) \| `null`

Quota block from the limits snapshot, timestamps normalised to ms.

---

### usage

> **usage**: [`CliAccountUsageTotals`](CliAccountUsageTotals.md) \| `null`

Today's usage from the request log, or null when the log is unreadable.
