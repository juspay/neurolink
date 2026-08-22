[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / QueuedAccountAdmission

# Type Alias: QueuedAccountAdmission

> **QueuedAccountAdmission** = `object`

Defined in: [types/proxy.ts:881](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/proxy.ts#L881)

A cancellable queued request for per-account admission capacity.

## Properties

### accountKey

> **accountKey**: `string`

Defined in: [types/proxy.ts:882](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/proxy.ts#L882)

---

### promise

> **promise**: `Promise`\<[`AccountAdmissionLease`](AccountAdmissionLease.md)\>

Defined in: [types/proxy.ts:883](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/proxy.ts#L883)

## Methods

### cancel()

> **cancel**(): `void`

Defined in: [types/proxy.ts:884](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/proxy.ts#L884)

#### Returns

`void`
