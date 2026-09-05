[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareAdmissionInput

# Type Alias: ProxyShareAdmissionInput

> **ProxyShareAdmissionInput** = `object`

Defined in: [types/proxy.ts:3640](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3640)

Everything `evaluateShareAdmission` needs. Pure input — no I/O.

## Properties

### grant

> **grant**: [`ProxyShareGrant`](ProxyShareGrant.md)

Defined in: [types/proxy.ts:3641](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3641)

---

### now

> **now**: `number`

Defined in: [types/proxy.ts:3642](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3642)

---

### model?

> `optional` **model?**: `string`

Defined in: [types/proxy.ts:3644](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3644)

Requested model, used against the model allowlist.

---

### counters

> **counters**: [`ProxyShareRuntimeCounters`](ProxyShareRuntimeCounters.md)

Defined in: [types/proxy.ts:3645](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3645)

---

### coinBalance?

> `optional` **coinBalance?**: `number`

Defined in: [types/proxy.ts:3647](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3647)

Remaining coins; omitted for an unlimited grant.
