[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyLimitsAccountResult

# Type Alias: ProxyLimitsAccountResult

> **ProxyLimitsAccountResult** = `object`

Defined in: [types/proxy.ts:1809](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1809)

Per-account result inside a GET /limits response.

## Properties

### account

> **account**: `string`

Defined in: [types/proxy.ts:1811](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1811)

Account label (quota-store key).

---

### key

> **key**: `string`

Defined in: [types/proxy.ts:1813](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1813)

Token-store key ("anthropic:<label>" or "codex:<label>").

---

### provider

> **provider**: [`ProxyAccountProvider`](ProxyAccountProvider.md)

Defined in: [types/proxy.ts:1819](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1819)

Which pool engine owns this login. Two logins can share a label — an
operator may use one email for both — so the key, not the label, is the
identity, and this names the engine without parsing the key's prefix.

---

### type

> **type**: [`ProxyAccountType`](ProxyAccountType.md)

Defined in: [types/proxy.ts:1820](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1820)

---

### status

> **status**: `"refreshed"` \| `"throttled"` \| `"skipped_api_key"` \| `"snapshot"` \| `"error"`

Defined in: [types/proxy.ts:1821](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1821)

---

### quota

> **quota**: [`AccountQuota`](AccountQuota.md) \| `null`

Defined in: [types/proxy.ts:1823](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1823)

Fresh quota on "refreshed"; last known snapshot otherwise (may be null).

---

### error?

> `optional` **error?**: `string`

Defined in: [types/proxy.ts:1824](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1824)

---

### coolingUntil?

> `optional` **coolingUntil?**: `number`

Defined in: [types/proxy.ts:1825](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1825)

---

### coolingReason?

> `optional` **coolingReason?**: [`AccountCoolingReason`](AccountCoolingReason.md)

Defined in: [types/proxy.ts:1826](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1826)
