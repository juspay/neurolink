[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyLimitsAccountResult

# Type Alias: ProxyLimitsAccountResult

> **ProxyLimitsAccountResult** = `object`

Defined in: [types/proxy.ts:1879](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1879)

Per-account result inside a GET /limits response.

## Properties

### account

> **account**: `string`

Defined in: [types/proxy.ts:1881](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1881)

Account label (quota-store key).

---

### key

> **key**: `string`

Defined in: [types/proxy.ts:1883](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1883)

Token-store key ("anthropic:<label>" or "codex:<label>").

---

### provider

> **provider**: [`ProxyAccountProvider`](ProxyAccountProvider.md)

Defined in: [types/proxy.ts:1889](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1889)

Which pool engine owns this login. Two logins can share a label — an
operator may use one email for both — so the key, not the label, is the
identity, and this names the engine without parsing the key's prefix.

---

### type

> **type**: [`ProxyAccountType`](ProxyAccountType.md)

Defined in: [types/proxy.ts:1890](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1890)

---

### status

> **status**: `"refreshed"` \| `"throttled"` \| `"skipped_api_key"` \| `"snapshot"` \| `"error"`

Defined in: [types/proxy.ts:1891](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1891)

---

### quota

> **quota**: [`AccountQuota`](AccountQuota.md) \| `null`

Defined in: [types/proxy.ts:1893](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1893)

Fresh quota on "refreshed"; last known snapshot otherwise (may be null).

---

### error?

> `optional` **error?**: `string`

Defined in: [types/proxy.ts:1894](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1894)

---

### coolingUntil?

> `optional` **coolingUntil?**: `number`

Defined in: [types/proxy.ts:1895](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1895)

---

### coolingReason?

> `optional` **coolingReason?**: [`AccountCoolingReason`](AccountCoolingReason.md)

Defined in: [types/proxy.ts:1896](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1896)
