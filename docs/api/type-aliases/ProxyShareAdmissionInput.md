[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareAdmissionInput

# Type Alias: ProxyShareAdmissionInput

> **ProxyShareAdmissionInput** = `object`

Defined in: [types/proxy.ts:3519](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3519)

Everything `evaluateShareAdmission` needs. Pure input — no I/O.

## Properties

### grant

> **grant**: [`ProxyShareGrant`](ProxyShareGrant.md)

Defined in: [types/proxy.ts:3520](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3520)

---

### now

> **now**: `number`

Defined in: [types/proxy.ts:3521](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3521)

---

### model?

> `optional` **model?**: `string`

Defined in: [types/proxy.ts:3523](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3523)

Requested model, used against the model allowlist.

---

### counters

> **counters**: [`ProxyShareRuntimeCounters`](ProxyShareRuntimeCounters.md)

Defined in: [types/proxy.ts:3524](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3524)

---

### coinBalance?

> `optional` **coinBalance?**: `number`

Defined in: [types/proxy.ts:3526](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3526)

Remaining coins; omitted for an unlimited grant.
