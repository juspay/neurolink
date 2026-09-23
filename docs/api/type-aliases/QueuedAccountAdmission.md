[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / QueuedAccountAdmission

# Type Alias: QueuedAccountAdmission

> **QueuedAccountAdmission** = `object`

Defined in: [types/proxy.ts:1311](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1311)

A cancellable queued request for per-account admission capacity.

## Properties

### accountKey

> **accountKey**: `string`

Defined in: [types/proxy.ts:1312](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1312)

---

### promise

> **promise**: `Promise`\<[`AccountAdmissionLease`](AccountAdmissionLease.md)\>

Defined in: [types/proxy.ts:1313](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1313)

## Methods

### cancel()

> **cancel**(): `void`

Defined in: [types/proxy.ts:1314](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1314)

#### Returns

`void`
