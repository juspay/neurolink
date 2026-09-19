[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyLimitsAccountResult

# Type Alias: ProxyLimitsAccountResult

> **ProxyLimitsAccountResult** = `object`

Defined in: [types/proxy.ts:1738](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1738)

Per-account result inside a GET /limits response.

## Properties

### account

> **account**: `string`

Defined in: [types/proxy.ts:1740](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1740)

Account label (quota-store key).

---

### key

> **key**: `string`

Defined in: [types/proxy.ts:1742](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1742)

Token-store key ("anthropic:<label>" or "codex:<label>").

---

### provider

> **provider**: [`ProxyAccountProvider`](ProxyAccountProvider.md)

Defined in: [types/proxy.ts:1748](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1748)

Which pool engine owns this login. Two logins can share a label — an
operator may use one email for both — so the key, not the label, is the
identity, and this names the engine without parsing the key's prefix.

---

### type

> **type**: [`ProxyAccountType`](ProxyAccountType.md)

Defined in: [types/proxy.ts:1749](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1749)

---

### status

> **status**: `"refreshed"` \| `"throttled"` \| `"skipped_api_key"` \| `"snapshot"` \| `"error"`

Defined in: [types/proxy.ts:1750](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1750)

---

### quota

> **quota**: [`AccountQuota`](AccountQuota.md) \| `null`

Defined in: [types/proxy.ts:1752](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1752)

Fresh quota on "refreshed"; last known snapshot otherwise (may be null).

---

### error?

> `optional` **error?**: `string`

Defined in: [types/proxy.ts:1753](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1753)

---

### coolingUntil?

> `optional` **coolingUntil?**: `number`

Defined in: [types/proxy.ts:1754](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1754)

---

### coolingReason?

> `optional` **coolingReason?**: [`AccountCoolingReason`](AccountCoolingReason.md)

Defined in: [types/proxy.ts:1755](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1755)
