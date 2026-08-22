[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyLimitsAccountResult

# Type Alias: ProxyLimitsAccountResult

> **ProxyLimitsAccountResult** = `object`

Defined in: [types/proxy.ts:1359](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1359)

Per-account result inside a GET /limits response.

## Properties

### account

> **account**: `string`

Defined in: [types/proxy.ts:1361](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1361)

Account label (quota-store key).

---

### key

> **key**: `string`

Defined in: [types/proxy.ts:1363](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1363)

Token-store key ("anthropic:<label>").

---

### type

> **type**: [`ProxyAccountType`](ProxyAccountType.md)

Defined in: [types/proxy.ts:1364](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1364)

---

### status

> **status**: `"refreshed"` \| `"throttled"` \| `"skipped_api_key"` \| `"snapshot"` \| `"error"`

Defined in: [types/proxy.ts:1365](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1365)

---

### quota

> **quota**: [`AccountQuota`](AccountQuota.md) \| `null`

Defined in: [types/proxy.ts:1367](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1367)

Fresh quota on "refreshed"; last known snapshot otherwise (may be null).

---

### error?

> `optional` **error?**: `string`

Defined in: [types/proxy.ts:1368](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1368)

---

### coolingUntil?

> `optional` **coolingUntil?**: `number`

Defined in: [types/proxy.ts:1369](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1369)

---

### coolingReason?

> `optional` **coolingReason?**: [`AccountCoolingReason`](AccountCoolingReason.md)

Defined in: [types/proxy.ts:1370](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1370)
