[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / QueuedAccountAdmission

# Type Alias: QueuedAccountAdmission

> **QueuedAccountAdmission** = `object`

Defined in: [types/proxy.ts:1376](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1376)

A cancellable queued request for per-account admission capacity.

## Properties

### accountKey

> **accountKey**: `string`

Defined in: [types/proxy.ts:1377](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1377)

---

### promise

> **promise**: `Promise`\<[`AccountAdmissionLease`](AccountAdmissionLease.md)\>

Defined in: [types/proxy.ts:1378](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1378)

## Methods

### cancel()

> **cancel**(): `void`

Defined in: [types/proxy.ts:1379](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1379)

#### Returns

`void`
