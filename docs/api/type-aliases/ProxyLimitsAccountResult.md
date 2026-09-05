[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyLimitsAccountResult

# Type Alias: ProxyLimitsAccountResult

> **ProxyLimitsAccountResult** = `object`

Defined in: [types/proxy.ts:1446](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1446)

Per-account result inside a GET /limits response.

## Properties

### account

> **account**: `string`

Defined in: [types/proxy.ts:1448](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1448)

Account label (quota-store key).

---

### key

> **key**: `string`

Defined in: [types/proxy.ts:1450](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1450)

Token-store key ("anthropic:<label>" or "codex:<label>").

---

### provider

> **provider**: [`ProxyAccountProvider`](ProxyAccountProvider.md)

Defined in: [types/proxy.ts:1456](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1456)

Which pool engine owns this login. Two logins can share a label — an
operator may use one email for both — so the key, not the label, is the
identity, and this names the engine without parsing the key's prefix.

---

### type

> **type**: [`ProxyAccountType`](ProxyAccountType.md)

Defined in: [types/proxy.ts:1457](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1457)

---

### status

> **status**: `"refreshed"` \| `"throttled"` \| `"skipped_api_key"` \| `"snapshot"` \| `"error"`

Defined in: [types/proxy.ts:1458](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1458)

---

### quota

> **quota**: [`AccountQuota`](AccountQuota.md) \| `null`

Defined in: [types/proxy.ts:1460](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1460)

Fresh quota on "refreshed"; last known snapshot otherwise (may be null).

---

### error?

> `optional` **error?**: `string`

Defined in: [types/proxy.ts:1461](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1461)

---

### coolingUntil?

> `optional` **coolingUntil?**: `number`

Defined in: [types/proxy.ts:1462](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1462)

---

### coolingReason?

> `optional` **coolingReason?**: [`AccountCoolingReason`](AccountCoolingReason.md)

Defined in: [types/proxy.ts:1463](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1463)
