[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / LocalUsageReader

# Type Alias: LocalUsageReader

> **LocalUsageReader** = `object`

Defined in: [types/localUsage.ts:131](https://github.com/juspay/neurolink/blob/release/src/lib/types/localUsage.ts#L131)

The contract every reader implements — one per CLI.

## Properties

### descriptor

> **descriptor**: [`LocalUsageReaderDescriptor`](LocalUsageReaderDescriptor.md)

Defined in: [types/localUsage.ts:132](https://github.com/juspay/neurolink/blob/release/src/lib/types/localUsage.ts#L132)

---

### detect

> **detect**: () => `Promise`\<`boolean`\>

Defined in: [types/localUsage.ts:138](https://github.com/juspay/neurolink/blob/release/src/lib/types/localUsage.ts#L138)

Whether this CLI's local store appears to exist on this machine at all —
the same "do not report on something never installed" discipline the proxy
client configurators use before writing a config.

#### Returns

`Promise`\<`boolean`\>

---

### scan

> **scan**: (`options?`) => `Promise`\<[`LocalUsageScanResult`](LocalUsageScanResult.md)\>

Defined in: [types/localUsage.ts:139](https://github.com/juspay/neurolink/blob/release/src/lib/types/localUsage.ts#L139)

#### Parameters

##### options?

[`LocalUsageScanOptions`](LocalUsageScanOptions.md)

#### Returns

`Promise`\<[`LocalUsageScanResult`](LocalUsageScanResult.md)\>
