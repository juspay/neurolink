[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareAdmissionInput

# Type Alias: ProxyShareAdmissionInput

> **ProxyShareAdmissionInput** = `object`

Defined in: [types/proxy.ts:3620](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3620)

Everything `evaluateShareAdmission` needs. Pure input — no I/O.

## Properties

### grant

> **grant**: [`ProxyShareGrant`](ProxyShareGrant.md)

Defined in: [types/proxy.ts:3621](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3621)

---

### now

> **now**: `number`

Defined in: [types/proxy.ts:3622](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3622)

---

### model?

> `optional` **model?**: `string`

Defined in: [types/proxy.ts:3624](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3624)

Requested model, used against the model allowlist.

---

### counters

> **counters**: [`ProxyShareRuntimeCounters`](ProxyShareRuntimeCounters.md)

Defined in: [types/proxy.ts:3625](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3625)

---

### coinBalance?

> `optional` **coinBalance?**: `number`

Defined in: [types/proxy.ts:3627](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3627)

Remaining coins; omitted for an unlimited grant.
