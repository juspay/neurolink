[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareAdmissionInput

# Type Alias: ProxyShareAdmissionInput

> **ProxyShareAdmissionInput** = `object`

Defined in: [types/proxy.ts:3839](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3839)

Everything `evaluateShareAdmission` needs. Pure input — no I/O.

## Properties

### grant

> **grant**: [`ProxyShareGrant`](ProxyShareGrant.md)

Defined in: [types/proxy.ts:3840](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3840)

---

### now

> **now**: `number`

Defined in: [types/proxy.ts:3841](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3841)

---

### model?

> `optional` **model?**: `string`

Defined in: [types/proxy.ts:3843](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3843)

Requested model, used against the model allowlist.

---

### counters

> **counters**: [`ProxyShareRuntimeCounters`](ProxyShareRuntimeCounters.md)

Defined in: [types/proxy.ts:3844](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3844)

---

### coinBalance?

> `optional` **coinBalance?**: `number`

Defined in: [types/proxy.ts:3846](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3846)

Remaining coins; omitted for an unlimited grant.
