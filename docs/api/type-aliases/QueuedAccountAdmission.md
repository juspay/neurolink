[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / QueuedAccountAdmission

# Type Alias: QueuedAccountAdmission

> **QueuedAccountAdmission** = `object`

Defined in: [types/proxy.ts:944](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L944)

A cancellable queued request for per-account admission capacity.

## Properties

### accountKey

> **accountKey**: `string`

Defined in: [types/proxy.ts:945](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L945)

---

### promise

> **promise**: `Promise`\<[`AccountAdmissionLease`](AccountAdmissionLease.md)\>

Defined in: [types/proxy.ts:946](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L946)

## Methods

### cancel()

> **cancel**(): `void`

Defined in: [types/proxy.ts:947](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L947)

#### Returns

`void`
