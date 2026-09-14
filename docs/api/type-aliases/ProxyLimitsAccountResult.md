[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyLimitsAccountResult

# Type Alias: ProxyLimitsAccountResult

> **ProxyLimitsAccountResult** = `object`

Defined in: [types/proxy.ts:1633](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1633)

Per-account result inside a GET /limits response.

## Properties

### account

> **account**: `string`

Defined in: [types/proxy.ts:1635](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1635)

Account label (quota-store key).

---

### key

> **key**: `string`

Defined in: [types/proxy.ts:1637](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1637)

Token-store key ("anthropic:<label>" or "codex:<label>").

---

### provider

> **provider**: [`ProxyAccountProvider`](ProxyAccountProvider.md)

Defined in: [types/proxy.ts:1643](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1643)

Which pool engine owns this login. Two logins can share a label — an
operator may use one email for both — so the key, not the label, is the
identity, and this names the engine without parsing the key's prefix.

---

### type

> **type**: [`ProxyAccountType`](ProxyAccountType.md)

Defined in: [types/proxy.ts:1644](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1644)

---

### status

> **status**: `"refreshed"` \| `"throttled"` \| `"skipped_api_key"` \| `"snapshot"` \| `"error"`

Defined in: [types/proxy.ts:1645](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1645)

---

### quota

> **quota**: [`AccountQuota`](AccountQuota.md) \| `null`

Defined in: [types/proxy.ts:1647](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1647)

Fresh quota on "refreshed"; last known snapshot otherwise (may be null).

---

### error?

> `optional` **error?**: `string`

Defined in: [types/proxy.ts:1648](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1648)

---

### coolingUntil?

> `optional` **coolingUntil?**: `number`

Defined in: [types/proxy.ts:1649](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1649)

---

### coolingReason?

> `optional` **coolingReason?**: [`AccountCoolingReason`](AccountCoolingReason.md)

Defined in: [types/proxy.ts:1650](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1650)
