[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyLimitsAccountResult

# Type Alias: ProxyLimitsAccountResult

> **ProxyLimitsAccountResult** = `object`

Defined in: [types/proxy.ts:1640](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1640)

Per-account result inside a GET /limits response.

## Properties

### account

> **account**: `string`

Defined in: [types/proxy.ts:1642](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1642)

Account label (quota-store key).

---

### key

> **key**: `string`

Defined in: [types/proxy.ts:1644](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1644)

Token-store key ("anthropic:<label>" or "codex:<label>").

---

### provider

> **provider**: [`ProxyAccountProvider`](ProxyAccountProvider.md)

Defined in: [types/proxy.ts:1650](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1650)

Which pool engine owns this login. Two logins can share a label — an
operator may use one email for both — so the key, not the label, is the
identity, and this names the engine without parsing the key's prefix.

---

### type

> **type**: [`ProxyAccountType`](ProxyAccountType.md)

Defined in: [types/proxy.ts:1651](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1651)

---

### status

> **status**: `"refreshed"` \| `"throttled"` \| `"skipped_api_key"` \| `"snapshot"` \| `"error"`

Defined in: [types/proxy.ts:1652](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1652)

---

### quota

> **quota**: [`AccountQuota`](AccountQuota.md) \| `null`

Defined in: [types/proxy.ts:1654](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1654)

Fresh quota on "refreshed"; last known snapshot otherwise (may be null).

---

### error?

> `optional` **error?**: `string`

Defined in: [types/proxy.ts:1655](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1655)

---

### coolingUntil?

> `optional` **coolingUntil?**: `number`

Defined in: [types/proxy.ts:1656](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1656)

---

### coolingReason?

> `optional` **coolingReason?**: [`AccountCoolingReason`](AccountCoolingReason.md)

Defined in: [types/proxy.ts:1657](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1657)
