[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyLimitsAccountResult

# Type Alias: ProxyLimitsAccountResult

> **ProxyLimitsAccountResult** = `object`

Defined in: [types/proxy.ts:1901](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1901)

Per-account result inside a GET /limits response.

## Properties

### account

> **account**: `string`

Defined in: [types/proxy.ts:1903](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1903)

Account label (quota-store key).

---

### key

> **key**: `string`

Defined in: [types/proxy.ts:1905](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1905)

Token-store key ("anthropic:<label>" or "codex:<label>").

---

### provider

> **provider**: [`ProxyAccountProvider`](ProxyAccountProvider.md)

Defined in: [types/proxy.ts:1911](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1911)

Which pool engine owns this login. Two logins can share a label — an
operator may use one email for both — so the key, not the label, is the
identity, and this names the engine without parsing the key's prefix.

---

### type

> **type**: [`ProxyAccountType`](ProxyAccountType.md)

Defined in: [types/proxy.ts:1912](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1912)

---

### status

> **status**: `"refreshed"` \| `"throttled"` \| `"skipped_api_key"` \| `"snapshot"` \| `"error"`

Defined in: [types/proxy.ts:1913](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1913)

---

### quota

> **quota**: [`AccountQuota`](AccountQuota.md) \| `null`

Defined in: [types/proxy.ts:1915](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1915)

Fresh quota on "refreshed"; last known snapshot otherwise (may be null).

---

### error?

> `optional` **error?**: `string`

Defined in: [types/proxy.ts:1916](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1916)

---

### coolingUntil?

> `optional` **coolingUntil?**: `number`

Defined in: [types/proxy.ts:1917](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1917)

---

### coolingReason?

> `optional` **coolingReason?**: [`AccountCoolingReason`](AccountCoolingReason.md)

Defined in: [types/proxy.ts:1918](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1918)
