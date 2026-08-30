[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyLimitsAccountResult

# Type Alias: ProxyLimitsAccountResult

> **ProxyLimitsAccountResult** = `object`

Defined in: [types/proxy.ts:1426](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1426)

Per-account result inside a GET /limits response.

## Properties

### account

> **account**: `string`

Defined in: [types/proxy.ts:1428](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1428)

Account label (quota-store key).

---

### key

> **key**: `string`

Defined in: [types/proxy.ts:1430](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1430)

Token-store key ("anthropic:<label>").

---

### type

> **type**: [`ProxyAccountType`](ProxyAccountType.md)

Defined in: [types/proxy.ts:1431](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1431)

---

### status

> **status**: `"refreshed"` \| `"throttled"` \| `"skipped_api_key"` \| `"snapshot"` \| `"error"`

Defined in: [types/proxy.ts:1432](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1432)

---

### quota

> **quota**: [`AccountQuota`](AccountQuota.md) \| `null`

Defined in: [types/proxy.ts:1434](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1434)

Fresh quota on "refreshed"; last known snapshot otherwise (may be null).

---

### error?

> `optional` **error?**: `string`

Defined in: [types/proxy.ts:1435](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1435)

---

### coolingUntil?

> `optional` **coolingUntil?**: `number`

Defined in: [types/proxy.ts:1436](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1436)

---

### coolingReason?

> `optional` **coolingReason?**: [`AccountCoolingReason`](AccountCoolingReason.md)

Defined in: [types/proxy.ts:1437](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1437)
