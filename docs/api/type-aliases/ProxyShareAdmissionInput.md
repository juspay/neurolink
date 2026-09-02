[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareAdmissionInput

# Type Alias: ProxyShareAdmissionInput

> **ProxyShareAdmissionInput** = `object`

Defined in: [types/proxy.ts:3611](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3611)

Everything `evaluateShareAdmission` needs. Pure input — no I/O.

## Properties

### grant

> **grant**: [`ProxyShareGrant`](ProxyShareGrant.md)

Defined in: [types/proxy.ts:3612](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3612)

---

### now

> **now**: `number`

Defined in: [types/proxy.ts:3613](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3613)

---

### model?

> `optional` **model?**: `string`

Defined in: [types/proxy.ts:3615](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3615)

Requested model, used against the model allowlist.

---

### counters

> **counters**: [`ProxyShareRuntimeCounters`](ProxyShareRuntimeCounters.md)

Defined in: [types/proxy.ts:3616](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3616)

---

### coinBalance?

> `optional` **coinBalance?**: `number`

Defined in: [types/proxy.ts:3618](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3618)

Remaining coins; omitted for an unlimited grant.
