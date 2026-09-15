[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / QueuedAccountAdmission

# Type Alias: QueuedAccountAdmission

> **QueuedAccountAdmission** = `object`

Defined in: [types/proxy.ts:1143](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1143)

A cancellable queued request for per-account admission capacity.

## Properties

### accountKey

> **accountKey**: `string`

Defined in: [types/proxy.ts:1144](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1144)

---

### promise

> **promise**: `Promise`\<[`AccountAdmissionLease`](AccountAdmissionLease.md)\>

Defined in: [types/proxy.ts:1145](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1145)

## Methods

### cancel()

> **cancel**(): `void`

Defined in: [types/proxy.ts:1146](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1146)

#### Returns

`void`
