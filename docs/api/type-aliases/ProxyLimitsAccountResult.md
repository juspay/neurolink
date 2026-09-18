[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyLimitsAccountResult

# Type Alias: ProxyLimitsAccountResult

> **ProxyLimitsAccountResult** = `object`

Defined in: [types/proxy.ts:1657](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1657)

Per-account result inside a GET /limits response.

## Properties

### account

> **account**: `string`

Defined in: [types/proxy.ts:1659](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1659)

Account label (quota-store key).

---

### key

> **key**: `string`

Defined in: [types/proxy.ts:1661](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1661)

Token-store key ("anthropic:<label>" or "codex:<label>").

---

### provider

> **provider**: [`ProxyAccountProvider`](ProxyAccountProvider.md)

Defined in: [types/proxy.ts:1667](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1667)

Which pool engine owns this login. Two logins can share a label — an
operator may use one email for both — so the key, not the label, is the
identity, and this names the engine without parsing the key's prefix.

---

### type

> **type**: [`ProxyAccountType`](ProxyAccountType.md)

Defined in: [types/proxy.ts:1668](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1668)

---

### status

> **status**: `"refreshed"` \| `"throttled"` \| `"skipped_api_key"` \| `"snapshot"` \| `"error"`

Defined in: [types/proxy.ts:1669](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1669)

---

### quota

> **quota**: [`AccountQuota`](AccountQuota.md) \| `null`

Defined in: [types/proxy.ts:1671](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1671)

Fresh quota on "refreshed"; last known snapshot otherwise (may be null).

---

### error?

> `optional` **error?**: `string`

Defined in: [types/proxy.ts:1672](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1672)

---

### coolingUntil?

> `optional` **coolingUntil?**: `number`

Defined in: [types/proxy.ts:1673](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1673)

---

### coolingReason?

> `optional` **coolingReason?**: [`AccountCoolingReason`](AccountCoolingReason.md)

Defined in: [types/proxy.ts:1674](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1674)
