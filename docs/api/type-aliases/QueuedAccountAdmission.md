[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / QueuedAccountAdmission

# Type Alias: QueuedAccountAdmission

> **QueuedAccountAdmission** = `object`

Defined in: [types/proxy.ts:1291](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1291)

A cancellable queued request for per-account admission capacity.

## Properties

### accountKey

> **accountKey**: `string`

Defined in: [types/proxy.ts:1292](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1292)

---

### promise

> **promise**: `Promise`\<[`AccountAdmissionLease`](AccountAdmissionLease.md)\>

Defined in: [types/proxy.ts:1293](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1293)

## Methods

### cancel()

> **cancel**(): `void`

Defined in: [types/proxy.ts:1294](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1294)

#### Returns

`void`
