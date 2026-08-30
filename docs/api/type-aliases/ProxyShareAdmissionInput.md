[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareAdmissionInput

# Type Alias: ProxyShareAdmissionInput

> **ProxyShareAdmissionInput** = `object`

Defined in: [types/proxy.ts:3589](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3589)

Everything `evaluateShareAdmission` needs. Pure input — no I/O.

## Properties

### grant

> **grant**: [`ProxyShareGrant`](ProxyShareGrant.md)

Defined in: [types/proxy.ts:3590](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3590)

---

### now

> **now**: `number`

Defined in: [types/proxy.ts:3591](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3591)

---

### model?

> `optional` **model?**: `string`

Defined in: [types/proxy.ts:3593](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3593)

Requested model, used against the model allowlist.

---

### counters

> **counters**: [`ProxyShareRuntimeCounters`](ProxyShareRuntimeCounters.md)

Defined in: [types/proxy.ts:3594](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3594)

---

### coinBalance?

> `optional` **coinBalance?**: `number`

Defined in: [types/proxy.ts:3596](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3596)

Remaining coins; omitted for an unlimited grant.
