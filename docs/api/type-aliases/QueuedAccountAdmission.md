[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / QueuedAccountAdmission

# Type Alias: QueuedAccountAdmission

> **QueuedAccountAdmission** = `object`

Defined in: [types/proxy.ts:1388](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1388)

A cancellable queued request for per-account admission capacity.

## Properties

### accountKey

> **accountKey**: `string`

Defined in: [types/proxy.ts:1389](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1389)

---

### promise

> **promise**: `Promise`\<[`AccountAdmissionLease`](AccountAdmissionLease.md)\>

Defined in: [types/proxy.ts:1390](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1390)

## Methods

### cancel()

> **cancel**(): `void`

Defined in: [types/proxy.ts:1391](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1391)

#### Returns

`void`
